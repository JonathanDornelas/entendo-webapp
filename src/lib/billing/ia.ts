import type { MotivoDoBloqueio } from './motivos';

/**
 * Os tipos da geração por IA que atravessam servidor → página → componente
 * (docs/adr-003-ia-gemini.md). Isomórfico: `MaterialForm.svelte` tipa contra
 * isto sem importar nada de `$lib/server`.
 */

/** Se dá para gerar e por quê não — a MESMA decisão de `can(estado, 'usar_ia')`, calculada no servidor. */
export interface EstadoDaIa {
	/** Existe provedor ligado (`LLM_PROVIDER`). */
	configurada: boolean;
	pode: boolean;
	motivo: MotivoDoBloqueio | null;
	saldo: number;
	custoPorProposta: number;
	/** Os idiomas em que a IA vai escrever, por extenso — a biblioteca não tem idioma próprio. */
	idiomas: string | null;
}

/** Uma proposta da IA como a página a recebe — já validada pelo servidor. */
export interface PropostaIa {
	id: string;
	dados: Record<string, unknown>;
	resumo: { esq: string; dir: string };
	reused: boolean;
}

export type RespostaDaGeracao =
	| { ok: true; propostas: PropostaIa[]; saldo: number }
	| { ok: false; error: string; motivo?: MotivoDoBloqueio | null };
