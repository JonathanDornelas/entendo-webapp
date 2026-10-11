import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server/db/client';
import { acessoDoProfessor } from '$lib/server/billing/acesso';
import { escola } from '$lib/server/db/repos/escola';
import { requireCoordenacao } from './guard';
import {
	aceitarConviteDaEscola,
	convidarParaEscola,
	criarEscola,
	definirExcecao,
	editarEscola,
	removerDaEscola,
	type DadosDaEscola
} from './escolas';

/**
 * O ambiente escolar contra o banco de dev (docs/adr-005-escola.md). O que este
 * arquivo tranca: a coordenação só lê a PRÓPRIA escola e só números; o último
 * assento não é ocupado duas vezes; o convite é de uso único e vence; e o
 * contrato da escola vale — e deixa de valer — como plano.
 */

const ids = {
	coordX: crypto.randomUUID(),
	profX: crypto.randomUUID(),
	coordY: crypto.randomUUID(),
	fora: crypto.randomUUID(),
	c1: crypto.randomUUID(),
	c2: crypto.randomUUID()
};
const escolas: string[] = [];

const contrato = (over: Partial<DadosDaEscola> = {}): DadosDaEscola => ({
	name: 'Escola X',
	seats: 3,
	atividadesPorProfessor: 20,
	materiaisPorProfessor: 200,
	creditosPorProfessor: 500,
	contractEndsAt: null,
	status: 'ativa',
	...over
});

async function entrar(schoolId: string, teacherId: string, role: 'coordenacao' | 'professor') {
	const r = await convidarParaEscola(schoolId, `${teacherId}@test.dev`, role);
	if (!r.ok) throw new Error(r.error);
	return aceitarConviteDaEscola(r.convite.token, teacherId);
}

const locaisDe = (id: string) => ({ user: { id } }) as unknown as App.Locals;

let x = '';
let y = '';

beforeAll(async () => {
	for (const id of Object.values(ids)) {
		await prisma.teacher.create({
			data: {
				id,
				name: `Prof ${id.slice(0, 4)}`,
				email: `${id}@test.dev`,
				subscriptionStatus: 'trialing',
				trialEndsAt: new Date(Date.now() - 1000)
			}
		});
	}
	x = (await criarEscola(contrato(), 'sistema')).id;
	y = (await criarEscola(contrato({ name: 'Escola Y' }), 'sistema')).id;
	escolas.push(x, y);
	await entrar(x, ids.coordX, 'coordenacao');
	await entrar(x, ids.profX, 'professor');
	await entrar(y, ids.coordY, 'coordenacao');

	// Uma turma do professor de X, com uma aluna e uma resposta terminada.
	const turma = await prisma.classroom.create({ data: { name: 'Turma 7A', teacherId: ids.profX } });
	const aluna = await prisma.student.create({
		data: {
			name: 'Aluna Secreta',
			email: 'aluna@test.dev',
			teacherId: ids.profX,
			classroomId: turma.id
		}
	});
	const atividade = await prisma.activity.create({ data: { title: 'A', teacherId: ids.profX } });
	const versao = await prisma.activityVersion.create({
		data: { activityId: atividade.id, versionNumber: 1 }
	});
	const item = await prisma.item.create({
		data: {
			order: 0,
			prompt: {},
			interaction: {},
			grading: {},
			locale: {},
			activityVersionId: versao.id
		}
	});
	const pub = await prisma.publication.create({
		data: { slug: `esc-${atividade.id}`, settings: {}, activityVersionId: versao.id }
	});
	const tentativa = await prisma.attempt.create({
		data: {
			name: 'Aluna Secreta',
			anonId: 'z',
			seed: 's',
			publicationId: pub.id,
			studentId: aluna.id,
			finishedAt: new Date()
		}
	});
	await prisma.attemptItem.create({
		data: {
			attemptId: tentativa.id,
			itemId: item.id,
			answer: { text: 'resposta secreta' },
			score: 0.75,
			ms: 1
		}
	});
});

afterAll(async () => {
	const dono = { activityVersion: { activity: { teacherId: { in: Object.values(ids) } } } };
	await prisma.attempt.deleteMany({ where: { publication: dono } });
	await prisma.publication.deleteMany({ where: dono });
	await prisma.school.deleteMany({ where: { id: { in: escolas } } });
	// A auditoria de escola não tem professor (é da escola): sai pelo id no `data`.
	for (const schoolId of escolas) {
		await prisma.auditEvent.deleteMany({
			where: { teacherId: null, data: { path: ['schoolId'], equals: schoolId } }
		});
	}
	await prisma.teacher.deleteMany({ where: { id: { in: Object.values(ids) } } });
});

describe('guarda da coordenação', () => {
	it('professor comum e quem não é de escola nenhuma recebem 404', async () => {
		await expect(requireCoordenacao(locaisDe(ids.profX))).rejects.toMatchObject({ status: 404 });
		await expect(requireCoordenacao(locaisDe(ids.fora))).rejects.toMatchObject({ status: 404 });
		expect((await requireCoordenacao(locaisDe(ids.coordX))).schoolId).toBe(x);
	});
});

describe('o que a coordenação lê', () => {
	it('só os membros da PRÓPRIA escola', async () => {
		const deX = await escola(await requireCoordenacao(locaisDe(ids.coordX))).professores();
		expect(deX.map((p) => p.id).sort()).toEqual([ids.coordX, ids.profX].sort());
		const deY = await escola(await requireCoordenacao(locaisDe(ids.coordY))).professores();
		expect(deY.map((p) => p.id)).toEqual([ids.coordY]);
	});

	it('números por turma, sem nome de aluno nem resposta', async () => {
		const turmas = await escola(await requireCoordenacao(locaisDe(ids.coordX))).turmas();
		expect(turmas).toHaveLength(1);
		expect(turmas[0]).toMatchObject({ alunos: 1, terminadas: 1, acertoMedio: 75 });
		const tudo = JSON.stringify(turmas);
		expect(tudo).not.toContain('Aluna Secreta');
		expect(tudo).not.toContain('aluna@test.dev');
		expect(tudo).not.toContain('resposta secreta');
		// A coordenação de Y não vê a turma de X.
		expect(await escola(await requireCoordenacao(locaisDe(ids.coordY))).turmas()).toEqual([]);
	});

	it('ex-membro sai da lista', async () => {
		await entrar(x, ids.fora, 'professor');
		const repo = escola(await requireCoordenacao(locaisDe(ids.coordX)));
		expect((await repo.professores()).map((p) => p.id)).toContain(ids.fora);
		expect(await removerDaEscola(x, ids.fora, 'sistema')).toEqual({ ok: true });
		expect((await repo.professores()).map((p) => p.id)).not.toContain(ids.fora);
	});

	it('a última pessoa da coordenação não sai', async () => {
		expect(await removerDaEscola(x, ids.coordX, 'sistema')).toMatchObject({ ok: false });
	});
});

describe('convites', () => {
	it('uso único, e convite vencido não entra', async () => {
		const z = (await criarEscola(contrato({ name: 'Escola Z', seats: 5 }), 'sistema')).id;
		escolas.push(z);
		const r = await convidarParaEscola(z, 'c1@test.dev', 'professor');
		if (!r.ok) throw new Error();
		expect(await aceitarConviteDaEscola(r.convite.token, ids.c1)).toMatchObject({ ok: true });
		// O mesmo token de novo, por outra conta: já foi usado.
		expect(await aceitarConviteDaEscola(r.convite.token, ids.c2)).toEqual({
			ok: false,
			motivo: 'usado'
		});

		const vencido = await convidarParaEscola(z, 'c2@test.dev', 'professor');
		if (!vencido.ok) throw new Error();
		await prisma.schoolInvite.update({
			where: { id: vencido.convite.id },
			data: { expiresAt: new Date(Date.now() - 1000) }
		});
		expect(await aceitarConviteDaEscola(vencido.convite.token, ids.c2)).toEqual({
			ok: false,
			motivo: 'expirado'
		});
		await removerDaEscola(z, ids.c1, 'sistema');
	});

	it('dois aceites para o ÚLTIMO assento: só um passa', async () => {
		const w = (await criarEscola(contrato({ name: 'Escola W', seats: 1 }), 'sistema')).id;
		escolas.push(w);
		const a = await convidarParaEscola(w, 'c1@test.dev', 'coordenacao');
		const b = await convidarParaEscola(w, 'c2@test.dev', 'coordenacao');
		if (!a.ok || !b.ok) throw new Error();
		const resultados = await Promise.all([
			aceitarConviteDaEscola(a.convite.token, ids.c1),
			aceitarConviteDaEscola(b.convite.token, ids.c2)
		]);
		expect(resultados.filter((r) => r.ok)).toHaveLength(1);
		expect(resultados.filter((r) => !r.ok)).toEqual([{ ok: false, motivo: 'sem-assento' }]);
		expect(await prisma.schoolMembership.count({ where: { schoolId: w } })).toBe(1);
	});
});

describe('o contrato vale como plano', () => {
	it('o membro tem os limites da escola, mesmo com o trial próprio vencido', async () => {
		const estado = await acessoDoProfessor({ id: ids.profX });
		expect({ plano: estado.plano, situacao: estado.situacao, limites: estado.limites }).toEqual({
			plano: 'scholar',
			situacao: 'ativa',
			limites: { atividades: 20, materiais: 200, creditosPorCiclo: 500, ia: true }
		});
		expect(estado.escola?.nome).toBe('Escola X');
	});

	it('a exceção do membro vence o padrão da escola', async () => {
		const membro = await prisma.schoolMembership.findUniqueOrThrow({
			where: { teacherId: ids.profX }
		});
		await definirExcecao(
			membro.id,
			{ atividadesMax: 50, materiaisMax: null, creditosMax: 0 },
			'sistema'
		);
		const estado = await acessoDoProfessor({ id: ids.profX });
		expect(estado.limites).toEqual({
			atividades: 50,
			materiais: 200,
			creditosPorCiclo: 0,
			ia: false
		});
	});

	it('escola suspensa: o membro volta ao próprio plano, sem perder nada', async () => {
		await editarEscola(x, contrato({ status: 'suspensa' }), 'sistema');
		const estado = await acessoDoProfessor({ id: ids.profX });
		expect({ origem: estado.origem, situacao: estado.situacao }).toEqual({
			origem: 'nenhum',
			situacao: 'expirada'
		});
		await editarEscola(x, contrato(), 'sistema');
	});

	it('contrato vencido também deixa de valer', async () => {
		await editarEscola(x, contrato({ contractEndsAt: new Date(Date.now() - 1000) }), 'sistema');
		expect((await acessoDoProfessor({ id: ids.profX })).plano).not.toBe('scholar');
		await editarEscola(x, contrato(), 'sistema');
	});
});
