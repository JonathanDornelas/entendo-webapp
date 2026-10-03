import { browser } from '$app/environment';

/**
 * O Player muda de CONTEÚDO no desktop, não só de CSS: o número dentro da
 * alternativa só faz sentido junto do atalho numérico, e o atalho só existe
 * onde há teclado. Isso não dá para resolver com `lg:` — precisa ser um valor
 * que o `{#if}` leia.
 *
 * A consulta é a MESMA que o `lg:` do Tailwind usa (64rem). Duas fontes de
 * verdade para o mesmo ponto de quebra dariam uma faixa de larguras em que a
 * legenda do teclado aparece e o leiaute de duas colunas não — ou o contrário.
 *
 * Nasce `false` (o servidor não conhece a tela do aluno) e vira `true` na
 * hidratação. O que aparece depois é sempre atalho, nunca a única forma de
 * responder — design-system.md "Acessibilidade".
 */

/** `lg` do Tailwind: o mesmo 64rem que as classes `lg:` desta tela usam. */
const LG = '(min-width: 64rem)';

class Viewport {
	desktop = $state(false);

	constructor() {
		if (!browser) return;
		const mq = window.matchMedia(LG);
		this.desktop = mq.matches;
		mq.addEventListener('change', (evento) => (this.desktop = evento.matches));
	}
}

export const viewport = new Viewport();
