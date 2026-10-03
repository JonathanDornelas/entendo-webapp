import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { prisma } from '$lib/server/db/client';
import { contarPendentes, estadoDaResposta, quando } from '$lib/server/resultados/leitura';
import { gradingSchema } from '$lib/kernel/item';

/**
 * A lista de atividades publicadas com a distribuição de acerto de cada uma.
 *
 * **Parcial tem faixa própria** (paginas.md): somar parcial ao erro esconde
 * exatamente o que o professor precisa ver.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const teacher = requireTeacher(locals);

	// Escopado pelo professor mesmo com a atividade já filtrada — repetir o
	// escopo não custa nada e é ele que impede o vazamento (db.md).
	const publicadas = await prisma.publication.findMany({
		where: { activityVersion: { activity: { teacherId: teacher.id } } },
		orderBy: { createdAt: 'desc' },
		include: {
			activityVersion: {
				include: { activity: true, items: { select: { id: true, grading: true } } }
			},
			attempts: { include: { items: true } }
		}
	});

	// Uma atividade republicada tem mais de uma publicação (o slug antigo é
	// arquivado, db.md). O professor vê UMA atividade, então as tentativas das
	// publicações antigas contam junto — senão o número dele cai sozinho toda
	// vez que ele republica.
	const porAtividade = new Map<
		string,
		{
			id: string;
			title: string;
			attempts: number;
			correct: number;
			partial: number;
			incorrect: number;
			pending: number;
			publishedAgo: string;
			lastAttempt: Date | null;
		}
	>();

	for (const publicacao of publicadas) {
		const activity = publicacao.activityVersion.activity;
		const porRubrica = new Set(
			publicacao.activityVersion.items
				.filter((item) => gradingSchema.parse(item.grading).mode === 'rubric')
				.map((item) => item.id)
		);

		const atual = porAtividade.get(activity.id) ?? {
			id: activity.id,
			title: activity.title,
			attempts: 0,
			correct: 0,
			partial: 0,
			incorrect: 0,
			pending: 0,
			publishedAgo: quando(publicacao.createdAt),
			lastAttempt: null as Date | null
		};

		atual.attempts += publicacao.attempts.length;
		for (const tentativa of publicacao.attempts) {
			if (!atual.lastAttempt || tentativa.startedAt > atual.lastAttempt) {
				atual.lastAttempt = tentativa.startedAt;
			}
			for (const linha of tentativa.items) {
				const estado = estadoDaResposta(linha, porRubrica.has(linha.itemId));
				atual[estado]++;
			}
		}
		porAtividade.set(activity.id, atual);
	}

	const activities = [...porAtividade.values()]
		.sort((a, b) => (b.lastAttempt?.getTime() ?? 0) - (a.lastAttempt?.getTime() ?? 0))
		.map((linha) => {
			// Percentual sobre as respostas CORRIGIDAS: incluir as pendentes faria
			// o acerto médio cair enquanto a fila do professor não anda.
			const corrigidas = linha.correct + linha.partial + linha.incorrect;
			const pct = (n: number) => (corrigidas === 0 ? 0 : Math.round((n / corrigidas) * 100));
			return {
				id: linha.id,
				title: linha.title,
				attempts: linha.attempts,
				correct: pct(linha.correct),
				partial: pct(linha.partial),
				incorrect: pct(linha.incorrect),
				pending: linha.pending,
				publishedAgo: linha.publishedAgo
			};
		});

	return {
		publishedCount: activities.length,
		totalAttempts: activities.reduce((total, a) => total + a.attempts, 0),
		pendingCount: await contarPendentes(teacher.id),
		activities
	};
};
