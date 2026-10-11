import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server/db/client';
import { comCota } from './cota';
import { LIMITES } from '$lib/billing/catalogo';
import { atividades } from '$lib/server/db/repos/activities';
import { gravarMateriais } from '$lib/server/atividades/gravar-materiais';
import { uso } from '$lib/server/db/repos/uso';
import { playerRepo } from '$lib/server/db/repos/player';

/**
 * A cota de ESTOQUE contra o banco de dev (docs/adr-002-billing.md). O que este
 * arquivo tranca: duas criações simultâneas não passam do limite, um lote
 * aceita só o que cabe, material reaproveitado não ocupa vaga, e apagar de vez
 * nunca alcança outro professor.
 */

const ids = { a: crypto.randomUUID(), b: crypto.randomUUID() };
const futuro = new Date(Date.now() + 30 * 24 * 3600 * 1000);

beforeAll(async () => {
	for (const id of [ids.a, ids.b]) {
		await prisma.teacher.create({
			data: {
				id,
				name: 'Cota',
				email: `cota-${id}@test.dev`,
				plan: 'basico',
				subscriptionStatus: 'active',
				currentPeriodEnd: futuro
			}
		});
	}
});

afterAll(async () => {
	await prisma.attempt.deleteMany({
		where: { publication: { activityVersion: { activity: { teacherId: { in: [ids.a, ids.b] } } } } }
	});
	await prisma.publication.deleteMany({
		where: { activityVersion: { activity: { teacherId: { in: [ids.a, ids.b] } } } }
	});
	await prisma.teacher.deleteMany({ where: { id: { in: [ids.a, ids.b] } } });
});

function criarComCota(teacherId: string, titulo: string) {
	return comCota({ id: teacherId }, 'atividades', 1, async (tx, cabem) => {
		if (cabem < 1) return null;
		return atividades({ id: teacherId }, tx).create(titulo, 'pt-BR', 'en-US', {
			itemTarget: 12,
			skills: ['reading']
		});
	});
}

describe('cota de atividades', () => {
	it('com UMA vaga, duas criações simultâneas: exatamente uma passa', async () => {
		const limite = LIMITES.basico.atividades;
		await prisma.activity.createMany({
			data: Array.from({ length: limite - 1 }, (_, i) => ({ title: `pre ${i}`, teacherId: ids.a }))
		});
		const [x, y] = await Promise.all([criarComCota(ids.a, 'X'), criarComCota(ids.a, 'Y')]);
		expect([x, y].filter(Boolean)).toHaveLength(1);
		expect((await uso({ id: ids.a }).contar()).atividades).toBe(limite);
	});

	it('arquivar libera a vaga', async () => {
		const umaDelas = await prisma.activity.findFirstOrThrow({ where: { teacherId: ids.a } });
		expect(await criarComCota(ids.a, 'cheio')).toBeNull();
		expect(await atividades({ id: ids.a }).arquivar(umaDelas.id)).toBe(true);
		expect(await criarComCota(ids.a, 'agora cabe')).not.toBeNull();
	});
});

describe('cota de materiais', () => {
	const par = (n: number) => ({ source: `frase ${n}`, target: `sentence ${n}` });

	it('lote maior que a sobra entra até o limite e relata o resto', async () => {
		const limite = LIMITES.basico.materiais;
		await prisma.contentUnit.createMany({
			data: Array.from({ length: limite - 5 }, (_, i) => ({
				kind: 'SentencePair',
				data: par(1000 + i),
				teacherId: ids.b
			}))
		});
		const r = await gravarMateriais(
			{ id: ids.b },
			{ kind: 'SentencePair', unidades: Array.from({ length: 8 }, (_, i) => par(i)) }
		);
		expect({ criados: r.criados, fora: r.foraDoLimite, motivo: r.motivo }).toEqual({
			criados: 5,
			fora: 3,
			motivo: 'materiais'
		});
		expect((await uso({ id: ids.b }).contar()).materiais).toBe(limite);
	});

	it('com a biblioteca cheia, material igual a um existente ainda é reaproveitado', async () => {
		const r = await gravarMateriais({ id: ids.b }, { kind: 'SentencePair', unidades: [par(0)] });
		expect({ criados: r.criados, reaproveitados: r.reaproveitados, fora: r.foraDoLimite }).toEqual({
			criados: 0,
			reaproveitados: 1,
			fora: 0
		});
	});

	it('conta pausada não grava nada', async () => {
		await prisma.teacher.update({
			where: { id: ids.b },
			data: { currentPeriodEnd: new Date(Date.now() - 60 * 24 * 3600 * 1000) }
		});
		const r = await gravarMateriais({ id: ids.b }, { kind: 'SentencePair', unidades: [par(0)] });
		expect({ reaproveitados: r.reaproveitados, motivo: r.motivo }).toEqual({
			reaproveitados: 0,
			motivo: 'publicar'
		});
		await prisma.teacher.update({ where: { id: ids.b }, data: { currentPeriodEnd: futuro } });
	});
});

describe('apagarDeVez', () => {
	it('apaga a atividade com publicação e tentativas, e não alcança outro professor', async () => {
		const atividade = await prisma.activity.create({ data: { title: 'apagar', teacherId: ids.b } });
		const versao = await prisma.activityVersion.create({
			data: { activityId: atividade.id, versionNumber: 1 }
		});
		const publicacao = await prisma.publication.create({
			data: { slug: `apagar-${atividade.id}`, settings: {}, activityVersionId: versao.id }
		});
		await prisma.attempt.create({
			data: { name: 'Aluno', anonId: 'x', seed: 's', publicationId: publicacao.id }
		});

		// O professor A não apaga a atividade do B — e não fica sabendo que existe.
		expect(await atividades({ id: ids.a }).apagarDeVez(atividade.id)).toBe(false);
		expect(await prisma.activity.findUnique({ where: { id: atividade.id } })).not.toBeNull();

		expect(await atividades({ id: ids.b }).apagarDeVez(atividade.id)).toBe(true);
		expect(await prisma.activity.findUnique({ where: { id: atividade.id } })).toBeNull();
		expect(await prisma.publication.findUnique({ where: { id: publicacao.id } })).toBeNull();
	});
});

describe('arquivada no Player', () => {
	it('a publicação traz o `archivedAt` da atividade para a entrada decidir', async () => {
		const atividade = await prisma.activity.create({
			data: { title: 'arquivada', teacherId: ids.b, archivedAt: new Date() }
		});
		const versao = await prisma.activityVersion.create({
			data: { activityId: atividade.id, versionNumber: 1 }
		});
		await prisma.publication.create({
			data: { slug: `arq-${atividade.id}`, settings: {}, activityVersionId: versao.id }
		});
		const publicacao = await playerRepo.publicationBySlug(`arq-${atividade.id}`);
		expect(publicacao?.activityVersion.activity.archivedAt).toBeInstanceOf(Date);
	});
});
