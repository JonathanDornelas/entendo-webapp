/**
 * Por que uma porta fechou. LISTA FECHADA, compartilhada por quem DECIDE o
 * bloqueio (`motivoDoBloqueio`, no servidor) e por quem o EXPLICA (`/planos?motivo=`).
 *
 * É fechada pelo mesmo motivo do `?voltar=` da prévia (paginas.md "Planos e
 * preços"): um parâmetro de query que vira texto na tela é texto que qualquer
 * pessoa escolhe. O loader de `/planos` só aceita o que está aqui.
 */
export const MOTIVOS_DE_BLOQUEIO = [
	'publicar',
	'trial',
	'criar',
	'materiais',
	'ia',
	'creditos',
	'escola'
] as const;

export type MotivoDoBloqueio = (typeof MOTIVOS_DE_BLOQUEIO)[number];

export function ehMotivo(valor: string | null | undefined): valor is MotivoDoBloqueio {
	return !!valor && (MOTIVOS_DE_BLOQUEIO as readonly string[]).includes(valor);
}

/** Motivos que são LIMITE de plano — a tela mostra "permite N, você tem M", não "assinatura". */
export const MOTIVOS_DE_LIMITE: readonly MotivoDoBloqueio[] = ['criar', 'materiais', 'creditos'];
