import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { prisma } from '$lib/server/db/client';
import { atividades } from '$lib/server/db/repos/activities';
import {
	estadoDaResposta,
	iniciais,
	duracao,
	quando,
	type AnswerState
} from '$lib/server/resultados/leitura';
import { resumoDoItem } from '$lib/server/atividades/resumo';
import { gradingSchema, interactionSchema } from '$lib/kernel/item';

/**
 * Como foi uma atividade: os itens por dificuldade e as tentativas.
 *
 * A tela lista a versão NO AR. Republicar cria outra publicação e arquiva o
 * slug antigo (db.md), mas as tentativas das anteriores continuam sendo desta
 * atividade — juntá-las é o que impede o número do professor de cair sozinho
 * toda vez que ele republica.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const teacher = requireTeacher(locals);
	const activity = await atividades(teacher).byId(params.activityId);
	if (!activity) error(404, 'Atividade não encontrada');

	const publicacoes = await prisma.publication.findMany({
		// Escopo repetido de propósito — ver db.md "Repositórios".
		where: { activityVersion: { activity: { id: activity.id, teacherId: teacher.id } } },
		orderBy: { createdAt: 'desc' },
		include: {
			activityVersion: { include: { items: { orderBy: { order: 'asc' } } } },
			attempts: { include: { items: true }, orderBy: { startedAt: 'desc' } }
		}
	});

	const noAr = publicacoes.some((p) => !p.slug.includes('~'));
	// Os itens mostrados são os da publicação MAIS RECENTE: é o que o aluno
	// encontra hoje ao abrir o link.
	const itensAtuais = publicacoes[0]?.activityVersion.items ?? [];
	const porRubrica = new Set(
		itensAtuais
			.filter((item) => gradingSchema.parse(item.grading).mode === 'rubric')
			.map((item) => item.id)
	);

	const estatistica = new Map<string, { correct: number; partial: number; incorrect: number }>();
	for (const item of itensAtuais)
		estatistica.set(item.id, { correct: 0, partial: 0, incorrect: 0 });

	const attempts: {
		id: string;
		initials: string;
		name: string;
		when: string;
		duration: string;
		startedAt: Date;
		itemStates: (AnswerState | 'empty')[];
	}[] = [];

	let pendingWriting = 0;

	for (const publicacao of publicacoes) {
		const itensDaPublicacao = publicacao.activityVersion.items;
		for (const tentativa of publicacao.attempts) {
			const porItem = new Map(tentativa.items.map((linha) => [linha.itemId, linha]));

			for (const linha of tentativa.items) {
				const estado = estadoDaResposta(linha, porRubrica.has(linha.itemId));
				if (estado === 'pending') pendingWriting++;
				const alvo = estatistica.get(linha.itemId);
				if (alvo && estado !== 'pending') alvo[estado]++;
			}

			attempts.push({
				id: tentativa.id,
				initials: iniciais(tentativa.name),
				name: tentativa.name,
				when: quando(tentativa.startedAt),
				duration: duracao(tentativa.startedAt, tentativa.finishedAt),
				startedAt: tentativa.startedAt,
				// Uma marca por item da versão que ELA respondeu — nunca da atual,
				// senão uma tentativa antiga apareceria com buracos que não existem.
				itemStates: itensDaPublicacao.map((item) => {
					const linha = porItem.get(item.id);
					if (!linha) return 'empty' as const;
					return estadoDaResposta(linha, gradingSchema.parse(item.grading).mode === 'rubric');
				})
			});
		}
	}

	attempts.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

	const items = itensAtuais
		.map((item, posicao) => {
			const stat = estatistica.get(item.id) ?? { correct: 0, partial: 0, incorrect: 0 };
			const total = stat.correct + stat.partial + stat.incorrect;
			const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
			return {
				id: item.id,
				index: posicao + 1,
				interactionLabel: `${resumoDoItem(item.generatedBy)} · ${interactionSchema.parse(item.interaction).type}`,
				correct: pct(stat.correct),
				partial: pct(stat.partial),
				incorrect: pct(stat.incorrect),
				respostas: total
			};
		})
		// "Ordenados por dificuldade" é literal: o que menos gente acertou vem
		// primeiro, porque é o que o professor precisa rever na aula seguinte.
		// Item ainda sem resposta vai para o fim — 0% ali é ausência, não erro.
		.sort((a, b) =>
			a.respostas === 0 || b.respostas === 0
				? a.respostas === b.respostas
					? a.index - b.index
					: a.respostas === 0
						? 1
						: -1
				: a.correct - b.correct
		);

	const corrigidas = items.reduce((total, i) => total + i.respostas, 0);
	const acertoMedio =
		corrigidas === 0
			? 0
			: Math.round(items.reduce((total, i) => total + i.correct * i.respostas, 0) / corrigidas);

	return {
		activity: { id: activity.id, title: activity.title, noAr },
		stats: [
			{ value: String(attempts.length), label: 'tentativas' },
			{ value: `${acertoMedio}%`, label: 'acerto médio', tone: 'text-success' },
			...(pendingWriting > 0
				? [{ value: String(pendingWriting), label: 'a comentar', tone: 'text-warning' }]
				: [])
		],
		// `respostas` e `startedAt` são de ORDENAÇÃO, não de tela: tudo que uma
		// remote function ou um loader devolve é serializado para o browser, então
		// o DTO leva só o que a página usa.
		items: items.map((item) => ({
			id: item.id,
			index: item.index,
			interactionLabel: item.interactionLabel,
			correct: item.correct,
			partial: item.partial,
			incorrect: item.incorrect
		})),
		attempts: attempts.map((tentativa) => ({
			id: tentativa.id,
			initials: tentativa.initials,
			name: tentativa.name,
			when: tentativa.when,
			duration: tentativa.duration,
			itemStates: tentativa.itemStates
		})),
		pendingWriting
	};
};
