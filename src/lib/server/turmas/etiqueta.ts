/**
 * As iniciais viram a etiqueta da turma: "7º B — inglês" → "7B". O indicador
 * ordinal (º/ª) sai fora: para o Unicode ele é letra, e "7º" não distingue uma
 * turma de outra.
 *
 * Mora aqui, e não no `+page.server.ts` da lista, porque um `+page.server.ts`
 * só pode exportar `load`/`actions`/as opções de rota — qualquer outro export
 * passa em `pnpm dev` e derruba o `vite build` na análise das páginas.
 */
export function etiquetaDaTurma(nome: string): string {
	const letras = nome.replace(/[^\p{L}\p{N}]|[ºª°]/gu, '');
	return letras.slice(0, 2).toUpperCase() || '?';
}
