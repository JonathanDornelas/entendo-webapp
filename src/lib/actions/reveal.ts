import type { Action } from 'svelte/action';

/**
 * `reveal-row` (app.css) nasce rodando: se o observer nunca disparar, o bloco
 * aparece normalmente. Esta action só pausa a animação e a libera quando o
 * elemento entra na viewport — nunca prende conteúdo em opacity: 0.
 */
export const reveal: Action<HTMLElement, { delay?: number } | undefined> = (
	node,
	{ delay = 0 } = {}
) => {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	if (!('IntersectionObserver' in window)) return;

	node.style.animationDelay = `${delay}ms`;
	node.style.animationPlayState = 'paused';

	const io = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			node.style.animationPlayState = 'running';
			io.disconnect();
		},
		{ threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
	);
	io.observe(node);

	return { destroy: () => io.disconnect() };
};
