import { comCota, motivoDeCriar } from '$lib/server/billing/cota';
import { liberada } from '$lib/server/billing/entitlements';
import { materiais } from '$lib/server/db/repos/content-units';
import type { ContentUnitKind } from '$lib/kernel/content/types';
import type { MotivoDoBloqueio } from '$lib/billing/motivos';

type TeacherScope = { id: string };

/** Teto de linhas por lote: o lote confere equivalência linha a linha DENTRO da trava de cota. */
export const MAX_LINHAS_POR_LOTE = 500;

export interface ResultadoDaGravacao {
	/** Linhas novas na biblioteca. */
	criados: number;
	/** Iguais a um material que o professor já tinha — não ocupam vaga nova. */
	reaproveitados: number;
	/** Novas que não couberam no estoque do plano. */
	foraDoLimite: number;
	/** Por que houve bloqueio — nulo quando tudo coube. */
	motivo: MotivoDoBloqueio | null;
	/** Ids gravados ou reaproveitados, na ordem do pedido (sem os de fora do limite). */
	ids: string[];
}

/**
 * Grava materiais respeitando o ESTOQUE do plano (docs/adr-002-billing.md). É o
 * caminho ÚNICO das quatro portas de entrada — adicionar um na etapa 2, colar
 * uma lista lá, cadastrar um na biblioteca, colar uma lista na biblioteca — e
 * da IA (aceitar propostas). Uma cópia por tela divergiria no primeiro ajuste.
 *
 * Regras:
 * - **Reaproveitado não conta.** Igual a um material que o professor já tem
 *   (`findEquivalent`) só é ligado à atividade; não cria linha nem ocupa vaga.
 * - **Cabe o que cabe.** Num lote maior que a sobra, entram os primeiros novos
 *   até o limite e o resto volta como `foraDoLimite` — a tela diz quantos
 *   ficaram de fora. Recusar o lote inteiro faria o professor recortar a lista
 *   na mão até adivinhar quantos cabem.
 * - Tudo dentro da trava de cota (`comCota`), então duas abas colando juntas
 *   não passam do limite.
 * - **A tag de idioma**: dentro de uma atividade, é a dela (o repositório
 *   resolve); na biblioteca, é a que o professor escolheu (`idioma`). O
 *   reaproveitado que estava sem idioma ganha a tag; o que já tinha, mantém.
 */
export async function gravarMateriais(
	teacher: TeacherScope,
	pedido: {
		kind: ContentUnitKind;
		unidades: unknown[];
		activityId?: string;
		/** Biblioteca: o idioma escolhido no formulário. Ignorado com `activityId`. */
		idioma?: string | null;
	}
): Promise<ResultadoDaGravacao> {
	const { kind, unidades, activityId, idioma = null } = pedido;
	return comCota(teacher, 'materiais', unidades.length, async (tx, cabem, estado) => {
		const resultado: ResultadoDaGravacao = {
			criados: 0,
			reaproveitados: 0,
			foraDoLimite: 0,
			motivo: null,
			ids: []
		};
		// Conta pausada (trial ou plano vencido) não cria nem liga nada.
		if (!liberada(estado.situacao)) {
			return {
				...resultado,
				foraDoLimite: unidades.length,
				motivo: motivoDeCriar(estado, 'materiais')
			};
		}

		const repo = materiais(teacher, tx);
		for (const dados of unidades) {
			const equivalente = await repo.findEquivalent(kind, dados);
			if (equivalente) {
				if (activityId) await repo.link(activityId, equivalente);
				else await repo.preencherIdioma(equivalente, idioma);
				resultado.reaproveitados++;
				resultado.ids.push(equivalente);
				continue;
			}
			if (resultado.criados >= cabem) {
				resultado.foraDoLimite++;
				continue;
			}
			const id = activityId
				? (await repo.createForActivity(activityId, kind, dados)).id
				: (await repo.create(kind, dados, idioma)).id;
			resultado.criados++;
			resultado.ids.push(id);
		}
		if (resultado.foraDoLimite > 0) resultado.motivo = motivoDeCriar(estado, 'materiais');
		return resultado;
	});
}

/** A frase de "ficaram de fora", igual nas duas telas. */
export function avisoDeLimite(r: ResultadoDaGravacao): string | null {
	if (r.foraDoLimite === 0) return null;
	if (r.motivo !== 'materiais') return 'Seu plano não permite adicionar materiais agora.';
	return r.foraDoLimite === 1
		? '1 material ficou de fora: a biblioteca chegou ao limite do plano.'
		: `${r.foraDoLimite} materiais ficaram de fora: a biblioteca chegou ao limite do plano.`;
}
