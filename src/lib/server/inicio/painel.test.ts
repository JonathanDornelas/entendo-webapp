import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server/db/client';
import { turmas } from '$lib/server/db/repos/classrooms';
import { painelDoInicio } from './painel';

/**
 * O início junta a conta INTEIRA do professor numa tela — tentativas, turmas,
 * módulos, resultados, materiais. É o lugar mais fácil de esquecer um
 * `teacherId` (regra inviolável nº 4), então o teste procura o que é do OUTRO
 * professor no JSON inteiro, não só nas contagens.
 */

const ids = { a: crypto.randomUUID(), b: crypto.randomUUID() };

/** Uma atividade publicada com uma questão, e uma tentativa que acertou ela. */
async function atividadeRespondida(teacherId: string, titulo: string, aluno: string) {
	const atividade = await prisma.activity.create({ data: { title: titulo, teacherId } });
	const versao = await prisma.activityVersion.create({
		data: { activityId: atividade.id, versionNumber: 1 }
	});
	const item = await prisma.item.create({
		data: {
			order: 0,
			prompt: { kind: 'text', text: 'Olá', instructionKey: 'translate-to-target' },
			interaction: { type: 'type', payload: { accepted: ['Hello'] } },
			grading: { mode: 'tolerant' },
			locale: { source: 'pt-BR', target: 'en-US' },
			activityVersionId: versao.id
		}
	});
	const publicacao = await prisma.publication.create({
		data: { slug: `inicio-${atividade.id}`, settings: {}, activityVersionId: versao.id }
	});
	const tentativa = await prisma.attempt.create({
		data: {
			name: aluno,
			anonId: crypto.randomUUID(),
			seed: 'semente',
			publicationId: publicacao.id,
			finishedAt: new Date()
		}
	});
	await prisma.attemptItem.create({
		data: { attemptId: tentativa.id, itemId: item.id, answer: { text: 'Hello' }, score: 1, ms: 900 }
	});
	return atividade;
}

beforeAll(async () => {
	for (const id of [ids.a, ids.b]) {
		await prisma.teacher.create({
			data: { id, name: 'Prof', email: `inicio-${id}@test.dev`, subscriptionStatus: 'trialing' }
		});
	}
	await atividadeRespondida(ids.a, 'Frutas da professora A', 'Aluna Secreta da A');
	await prisma.activity.create({ data: { title: 'Rascunho da A', teacherId: ids.a } });
	await turmas({ id: ids.a }).create('Turma da A', 'en-US', 'teal', [
		{ name: 'Aluna Secreta da A', email: 'secreta@test.dev' }
	]);
	await prisma.contentUnit.create({
		data: {
			teacherId: ids.a,
			kind: 'SentencePair',
			data: { source: 'Olá', target: 'Hello' },
			targetLang: 'en-US'
		}
	});

	await atividadeRespondida(ids.b, 'Cores do professor B', 'Aluno do B');
});

afterAll(async () => {
	// A ordem dos três RESTRICT (db.md "Apagar uma atividade de vez"): tentativas,
	// publicações, atividades — só então o professor.
	const dosDois = { activity: { teacherId: { in: [ids.a, ids.b] } } };
	await prisma.attempt.deleteMany({ where: { publication: { activityVersion: dosDois } } });
	await prisma.publication.deleteMany({ where: { activityVersion: dosDois } });
	await prisma.activity.deleteMany({ where: { teacherId: { in: [ids.a, ids.b] } } });
	await prisma.teacher.deleteMany({ where: { id: { in: [ids.a, ids.b] } } });
});

describe('o início do Studio', () => {
	it('conta só o que é do próprio professor', async () => {
		const a = await painelDoInicio({ id: ids.a });
		expect(a.tentativas.map((t) => t.nome)).toEqual(['Aluna Secreta da A']);
		expect(a.tentativas[0]).toMatchObject({ acerto: 100, estado: 'terminou', turma: null });
		expect(a.semana).toMatchObject({ tentativas: 1, acerto: 100 });
		expect(a.atividades).toMatchObject({ noAr: 1, rascunhos: 1, arquivadas: 0 });
		expect(a.turmas).toMatchObject({ total: 1, alunos: 1, comEmail: 1 });
		expect(a.materiais).toEqual({ total: 1, porTipo: [{ rotulo: 'Frases', n: 1 }] });
		expect(a.resultados).toMatchObject({ tentativas: 1, atividades: 1, acerto: 100 });
	});

	it('nada do outro professor aparece, em lugar nenhum do JSON', async () => {
		const b = await painelDoInicio({ id: ids.b });
		expect(b.tentativas.map((t) => t.nome)).toEqual(['Aluno do B']);
		expect(b.atividades).toMatchObject({ noAr: 1, rascunhos: 0 });
		expect(b.turmas).toMatchObject({ total: 0, alunos: 0, fileira: [] });
		expect(b.materiais.total).toBe(0);
		expect(b.resultados.tentativas).toBe(1);

		const json = JSON.stringify(b);
		for (const daA of [
			'Aluna Secreta da A',
			'Frutas da professora A',
			'Rascunho da A',
			'Turma da A'
		]) {
			expect(json).not.toContain(daA);
		}
	});

	it('a semana tem sete dias e marca hoje', async () => {
		const b = await painelDoInicio({ id: ids.b });
		expect(b.semana.barras).toHaveLength(7);
		expect(b.semana.barras.filter((d) => d.hoje)).toHaveLength(1);
		expect(b.semana.barras.find((d) => d.hoje)?.tentativas).toBe(1);
	});
});
