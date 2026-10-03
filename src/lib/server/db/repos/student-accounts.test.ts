import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server/db/client';
import type { Item } from '$lib/kernel/item';
import { atividades } from './activities';
import { turmas } from './classrooms';
import { playerRepo } from './player';
import { adotarTentativasDaConta, fichaDaConta, vincularFichaAConta } from './student-accounts';

const PLANO = { itemTarget: 12, skills: ['listening', 'speaking', 'reading', 'writing'] };

function itemDeTeste(texto: string): Item {
	return {
		id: '',
		sourceContentId: null,
		generatedBy: null,
		prompt: { kind: 'text', text: texto, instructionKey: 'translate' },
		interaction: { type: 'type', payload: { accepted: [texto] } },
		grading: { mode: 'exact' },
		locale: { source: 'pt-BR', target: 'en-US' }
	};
}

/**
 * O vínculo ficha ↔ conta atravessa DOIS donos — o professor da chamada e a
 * pessoa da conta —, e é onde a regra inviolável nº 4 é mais fácil de furar:
 * a conta pode estar em turmas de vários professores, e uma tentativa do
 * professor A nunca pode virar dado do B.
 */
describe('conta do aluno', () => {
	let teacherA: Awaited<ReturnType<typeof prisma.teacher.create>>;
	let teacherB: Awaited<ReturnType<typeof prisma.teacher.create>>;
	let conta: Awaited<ReturnType<typeof prisma.studentAccount.create>>;
	let publicacaoA: { id: string };
	let publicacaoB: { id: string };

	async function publicar(teacher: { id: string }, titulo: string) {
		const repo = atividades(teacher);
		const activity = await repo.create(titulo, 'pt-BR', 'en-US', PLANO);
		await repo.replaceDraftItems(activity.id, [itemDeTeste('livro')]);
		const publicacao = await repo.publishDraft(
			activity.id,
			`conta-${crypto.randomUUID().slice(0, 8)}`,
			{}
		);
		if (!publicacao) throw new Error('não publicou');
		return publicacao;
	}

	beforeAll(async () => {
		teacherA = await prisma.teacher.create({
			data: {
				id: crypto.randomUUID(),
				name: 'Professora A',
				email: `a-${crypto.randomUUID()}@test.dev`
			}
		});
		teacherB = await prisma.teacher.create({
			data: {
				id: crypto.randomUUID(),
				name: 'Professor B',
				email: `b-${crypto.randomUUID()}@test.dev`
			}
		});
		conta = await prisma.studentAccount.create({
			data: {
				id: crypto.randomUUID(),
				name: 'Juliana Prado',
				email: `ju-${crypto.randomUUID()}@test.dev`
			}
		});
		publicacaoA = await publicar(teacherA, 'Da A');
		publicacaoB = await publicar(teacherB, 'Do B');
	});

	afterAll(async () => {
		const ids = [teacherA?.id, teacherB?.id].filter((id) => id !== undefined);
		if (ids.length > 0) {
			// As tentativas apontam para a publicação sem cascata: saem antes.
			await prisma.attempt.deleteMany({
				where: { publication: { activityVersion: { activity: { teacherId: { in: ids } } } } }
			});
			await prisma.publication.deleteMany({
				where: { activityVersion: { activity: { teacherId: { in: ids } } } }
			});
			await prisma.teacher.deleteMany({ where: { id: { in: ids } } });
		}
		if (conta) await prisma.studentAccount.deleteMany({ where: { id: conta.id } });
	});

	it('ligar a ficha adota só as tentativas do professor dela', async () => {
		const turma = await turmas(teacherA).create('7º B', 'en-US', 'violeta', [
			{ name: 'Juliana Pereira', email: null }
		]);
		const ficha = turma.students[0]!;

		// Respondeu LOGADA, pelo link aberto, nas atividades dos dois professores:
		// tem conta, não tem ficha.
		const daA = await playerRepo.createAttempt(
			publicacaoA.id,
			'ju',
			'anon-1',
			'seed',
			null,
			conta.id
		);
		const daB = await playerRepo.createAttempt(
			publicacaoB.id,
			'ju',
			'anon-1',
			'seed',
			null,
			conta.id
		);

		expect(await vincularFichaAConta(ficha.id, conta.id)).toBe(true);

		const depoisA = await prisma.attempt.findUniqueOrThrow({ where: { id: daA.id } });
		const depoisB = await prisma.attempt.findUniqueOrThrow({ where: { id: daB.id } });
		// A da professora A ganhou a ficha E o nome do cadastro.
		expect(depoisA.studentId).toBe(ficha.id);
		expect(depoisA.name).toBe('Juliana Pereira');
		// A do professor B não foi tocada: a ficha é da A.
		expect(depoisB.studentId).toBeNull();
		expect(depoisB.name).toBe('ju');
	});

	it('nunca rouba uma ficha já ligada a outra conta', async () => {
		const outra = await prisma.studentAccount.create({
			data: { id: crypto.randomUUID(), name: 'Outra', email: `o-${crypto.randomUUID()}@test.dev` }
		});
		try {
			const turma = await turmas(teacherA).create('8º A', 'en-US', 'teal', [
				{ name: 'Marcos', email: null }
			]);
			const ficha = turma.students[0]!;
			expect(await vincularFichaAConta(ficha.id, outra.id)).toBe(true);
			expect(await vincularFichaAConta(ficha.id, conta.id)).toBe(false);
			const lida = await prisma.student.findUniqueOrThrow({ where: { id: ficha.id } });
			expect(lida.accountId).toBe(outra.id);
		} finally {
			await prisma.studentAccount.delete({ where: { id: outra.id } });
		}
	});

	it('a ficha da conta é a do professor certo, e prefere a turma que recebeu a atividade', async () => {
		const semEnvio = await turmas(teacherA).create('Sem envio', 'en-US', 'azul', [
			{ name: 'Juliana (turma antiga)', email: null }
		]);
		const comEnvio = await turmas(teacherA).create('Com envio', 'en-US', 'magenta', [
			{ name: 'Juliana (turma atual)', email: null }
		]);
		await vincularFichaAConta(semEnvio.students[0]!.id, conta.id);
		await vincularFichaAConta(comEnvio.students[0]!.id, conta.id);
		await prisma.delivery.create({
			data: { publicationId: publicacaoA.id, classroomId: comEnvio.id }
		});

		const ficha = await fichaDaConta(conta.id, teacherA.id, publicacaoA.id);
		expect(ficha?.name).toBe('Juliana (turma atual)');

		// Com o professor B ela não está em chamada nenhuma.
		expect(await fichaDaConta(conta.id, teacherB.id, publicacaoB.id)).toBeNull();
	});

	it('adotar pela ficha não alcança tentativa sem conta', async () => {
		const turma = await turmas(teacherB).create('Do B', 'en-US', 'ardosia', [
			{ name: 'Juliana no B', email: null }
		]);
		const ficha = turma.students[0]!;

		// Uma logada e uma anônima, na mesma atividade do B.
		const logada = await playerRepo.createAttempt(
			publicacaoB.id,
			'ju',
			'anon-3',
			'seed',
			null,
			conta.id
		);
		const anonima = await playerRepo.createAttempt(
			publicacaoB.id,
			'anon',
			'anon-4',
			'seed',
			null,
			null
		);

		const adotadas = await adotarTentativasDaConta(ficha.id, conta.id);
		// A logada (e a que sobrou do primeiro teste, também do B) ganham a ficha;
		// a anônima não tem conta e continua sem dono.
		expect(adotadas).toBeGreaterThanOrEqual(1);
		expect((await prisma.attempt.findUniqueOrThrow({ where: { id: logada.id } })).studentId).toBe(
			ficha.id
		);
		expect(
			(await prisma.attempt.findUniqueOrThrow({ where: { id: anonima.id } })).studentId
		).toBeNull();
	});
});
