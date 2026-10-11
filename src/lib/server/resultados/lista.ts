import { prisma } from '$lib/server/db/client';
import { estadoDaResposta, quando } from '$lib/server/resultados/leitura';
import { idiomaOuNulo } from '$lib/idiomas';
import { gradingSchema } from '$lib/kernel/item';

/**
 * As atividades publicadas com a distribuição de acerto de cada uma — a tabela
 * de `(studio)/resultados` e a peça "Resultados" do início. Mora aqui, e não no
 * loader, para os dois números serem o MESMO: o início dizer 64% e a tela de
 * resultados dizer 61% faria o professor duvidar dos dois.
 *
 * **Parcial tem faixa própria** (paginas.md): somar parcial ao erro esconde
 * exatamente o que o professor precisa ver.
 */
export async function listaDeResultados(teacherId: string) {
	// Escopado pelo professor mesmo com a atividade já filtrada — repetir o
	// escopo não custa nada e é ele que impede o vazamento (db.md).
	const publicadas = await prisma.publication.findMany({
		where: { activityVersion: { activity: { teacherId } } },
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
			idioma: string | null;
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
			idioma: idiomaOuNulo(activity.targetLang),
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
				idioma: linha.idioma,
				attempts: linha.attempts,
				correct: pct(linha.correct),
				partial: pct(linha.partial),
				incorrect: pct(linha.incorrect),
				publishedAgo: linha.publishedAgo,
				/** A última tentativa — a coluna "Última" e a ordem "mais recentes". */
				lastAttempt: linha.lastAttempt
			};
		});

	// O acerto médio do topo é PESADO POR TENTATIVA: uma atividade com uma
	// tentativa só não pode puxar a média tanto quanto uma com trinta.
	const totalAttempts = activities.reduce((total, a) => total + a.attempts, 0);
	const pesado = (campo: 'correct' | 'partial' | 'incorrect') =>
		totalAttempts === 0
			? null
			: Math.round(activities.reduce((t, a) => t + a[campo] * a.attempts, 0) / totalAttempts);

	return {
		publishedCount: activities.length,
		totalAttempts,
		averageCorrect: pesado('correct'),
		/** As três faixas pesadas do mesmo jeito — a barra da peça "Resultados" do início. */
		distribuicao: {
			correct: pesado('correct') ?? 0,
			partial: pesado('partial') ?? 0,
			incorrect: pesado('incorrect') ?? 0
		},
		activities
	};
}
