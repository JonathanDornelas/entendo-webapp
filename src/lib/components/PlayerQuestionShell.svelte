<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		index,
		total,
		onback,
		children,
		footer
	}: {
		index: number;
		total: number;
		onback?: () => void;
		children: Snippet;
		footer: Snippet;
	} = $props();

	let heading: HTMLElement;
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- lê `index` para o efeito rodar de novo a cada questão
		index;
		// preventScroll: a casca preenche o container, não a página inteira — sem isso,
		// montar o Player embutido numa página maior (ex.: /dev/components) rola a página até aqui.
		heading?.focus({ preventScroll: true });
	});
</script>

<div data-surface="player" class="flex h-full min-h-full flex-col bg-base-100">
	<header class="flex items-center gap-3 p-4 pb-3">
		<button
			type="button"
			class="btn btn-circle btn-ghost bg-base-200 text-base-content"
			onclick={onback}
			aria-label="Voltar"
		>
			<svg class="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M15 5l-7 7 7 7"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		<div class="h-2.5 flex-1 overflow-hidden rounded-full bg-base-300">
			<div
				class="h-full origin-left rounded-full bg-primary"
				style="transform: scaleX({index / total})"
			></div>
		</div>
		<span class="font-mono text-xs text-base-content/60">{index}/{total}</span>
	</header>

	<main class="flex flex-1 flex-col px-5 py-4" tabindex="-1" bind:this={heading}>
		{@render children()}
	</main>

	<footer class="flex gap-2.5 border-t border-line p-5 pt-3.5">
		{@render footer()}
	</footer>
</div>
