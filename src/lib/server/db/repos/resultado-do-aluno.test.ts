/**
 * O que a tela de resultado do aluno passou a mostrar, contra dado REAL: o
 * percurso da pessoa neste link, a média da turma, o "por quê" de cada nota e o
 * rótulo humano de cada questão.
 *
 * Os dois primeiros são consultas novas do `playerRepo` e estão aqui pela regra
 * de testes de repositório. Os dois últimos são suposições que o loader FAZ
 * sobre o kernel — que `Score.feedback` existe, e que `rotuloDoItem` não devolve
 * chave técnica. Quebrando qualquer uma, a tela não dá erro: ela fica com o
 * bloco "Por quê" vazio ou escreve "cloze · writing" para o aluno. Silêncio é
 * justamente o que pede teste.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server/db/client';
import { atividades } from './activities';
import { playerRepo } from './player';
import type { Item } from '$lib/kernel/item';

const PLANO = { itemTarget: 12, skills: ['listening', 'speaking', 'reading', 'writing'] };

function itemTolerante(alvo: string): Item {
	return {
		id: '',
		sourceContentId: null,
		generatedBy: null,
		prompt: { kind: 'text', text: alvo, instructionKey: 'translate' },
		interaction: { type: 'type', payload: { accepted: [alvo] } },
		grading: { mode: 'tolerant', tolerance: 0.9 },
		locale: { source: 'pt-BR', target: 'en-US' }
	};
}

function itemDeEscuta(alvo: string): Item {
	return {
		id: '',
		sourceContentId: null,
		generatedBy: null,
		prompt: { kind: 'audio', text: alvo, instructionKey: 'listenType' },
		interaction: { type: 'type', payload: { accepted: [alvo] } },
		grading: { mode: 'exact' },
		locale: { source: 'pt-BR', target: 'en-US' }
	};
}

describe('resultado do aluno com dado real', () => {
	let teacher: Awaited<ReturnType<typeof prisma.teacher.create>>;
	let publicacao: { id: string; slug: string };
	let tentativa: { id: string };
	let itemIds: string[] = [];

	beforeAll(async () => {
		teacher = await prisma.teacher.create({
			data: {
				id: crypto.randomUUID(),
				name: 'Professora Smoke',
				email: `smoke-${crypto.randomUUID()}@test.dev`
			}
		});
		const repo = atividades(teacher);
		const activity = await repo.create('Present perfect — smoke', 'pt-BR', 'en-US', PLANO);
		await repo.replaceDraftItems(activity.id, [
			itemTolerante('she has been working here'),
			itemDeEscuta('they have just arrived'),
			itemTolerante('he has finished')
		]);
		const pub = await repo.publishDraft(activity.id, `smoke-${crypto.randomUUID().slice(0, 8)}`, {
			showResult: true
		});
		if (!pub) throw new Error('não publicou');
		publicacao = pub;

		const att = await playerRepo.createAttempt(pub.id, 'João Smoke', 'anon-smoke', 'seed-smoke');
		tentativa = att;

		const cheia = await playerRepo.attemptById(att.id);
		itemIds = (cheia?.publication.activityVersion.items ?? []).map((i) => i.id);

		// Certa, parcial (falta o "g") e errada — mais os tempos, que é o que as
		// estatísticas leem.
		await playerRepo.recordAnswer(
			att.id,
			itemIds[0]!,
			{ text: 'she has been working here' },
			1,
			38_000
		);
		await playerRepo.recordAnswer(
			att.id,
			itemIds[1]!,
			{ text: 'they have just arrive' },
			0.5,
			96_000
		);
		await playerRepo.recordAnswer(
			att.id,
			itemIds[2]!,
			{ text: 'completamente outra coisa' },
			0,
			21_000
		);
		await prisma.attempt.update({ where: { id: att.id }, data: { finishedAt: new Date() } });
	});

	afterAll(async () => {
		// As tentativas apontam para a publicação sem cascata: saem antes.
		await prisma.attempt.deleteMany({
			where: { publication: { activityVersion: { activity: { teacherId: teacher.id } } } }
		});
		await prisma.publication.deleteMany({
			where: { activityVersion: { activity: { teacherId: teacher.id } } }
		});
		await prisma.teacher.deleteMany({ where: { id: teacher.id } });
	});

	it('conta as entregas desta pessoa neste link', async () => {
		const entregas = await playerRepo.concludedAttempts(publicacao.id, { anonId: 'anon-smoke' });
		expect(entregas.map((e) => e.items.length)).toEqual([3]);
	});

	it('a média da turma é nula quando só esta pessoa entregou', async () => {
		// Ela EXCLUI a tentativa do próprio aluno — comparar-se consigo é nada, e
		// nulo é o que faz a tela OMITIR a linha em vez de dizer "a turma leva 0 s".
		expect(await playerRepo.avgMsPorQuestao(publicacao.id, tentativa.id)).toBeNull();
	});

	it('a média da turma sai do tempo de quem TERMINOU, e não conta o próprio aluno', async () => {
		// Uma colega entrega com 10 s por questão; quem abandonou no meio não entra
		// na conta — o tempo dele é de desistir, não de resolver.
		const colega = await playerRepo.createAttempt(
			publicacao.id,
			'Colega',
			'anon-colega',
			'seed-colega'
		);
		await playerRepo.recordAnswer(colega.id, itemIds[0]!, { text: 'x' }, 0, 10_000);
		await playerRepo.recordAnswer(colega.id, itemIds[1]!, { text: 'y' }, 0, 10_000);
		await prisma.attempt.update({ where: { id: colega.id }, data: { finishedAt: new Date() } });

		const abandonou = await playerRepo.createAttempt(
			publicacao.id,
			'Abandonou',
			'anon-abandonou',
			'seed-abandonou'
		);
		await playerRepo.recordAnswer(abandonou.id, itemIds[0]!, { text: 'z' }, 0, 600_000);

		expect(await playerRepo.avgMsPorQuestao(publicacao.id, tentativa.id)).toBe(10_000);
	});

	it('recorrigir devolve o "por quê" da nota parcial', async () => {
		const { getInteraction } = await import('$lib/kernel/interactions/registry');
		const { getProfile } = await import('$lib/kernel/language/profiles');
		const cheia = await playerRepo.attemptById(tentativa.id);
		const item = cheia!.publication.activityVersion.items[1]!;
		const resposta = cheia!.items.find((r) => r.itemId === item.id)!;

		const nota = getInteraction('type').grade(
			(item.interaction as { payload: unknown }).payload,
			resposta.answer,
			getProfile('en-US'),
			`${cheia!.seed}:${item.id}`
		);
		expect(
			nota.ok && typeof nota.value.feedback === 'string' && nota.value.feedback.length > 0
		).toBe(true);
	});

	it('os rótulos saem humanos, não a chave técnica', async () => {
		const { rotuloDoItem } = await import('$lib/server/player/rotulo');
		const { promptSchema, interactionSchema, gradingSchema } = await import('$lib/kernel/item');
		const cheia = await playerRepo.attemptById(tentativa.id);

		const rotulos = cheia!.publication.activityVersion.items.map((item) =>
			rotuloDoItem(
				promptSchema.parse(item.prompt),
				interactionSchema.parse(item.interaction).type,
				gradingSchema.parse(item.grading).mode
			)
		);
		expect(rotulos).toEqual(['escrita tolerante', 'escuta', 'escrita tolerante']);
	});
});
