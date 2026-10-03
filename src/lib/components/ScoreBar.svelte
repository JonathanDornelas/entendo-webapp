<script lang="ts">
	// Faixa correto/parcial/incorreto. PARCIAL TEM FAIXA PRÓPRIA — somar parcial ao
	// erro esconde exatamente o que o professor precisa ver (design-system.md).
	let {
		correct = 0,
		partial = 0,
		incorrect = 0,
		height = 'h-2',
		animate = true,
		delay = 0
	}: {
		correct?: number;
		partial?: number;
		incorrect?: number;
		height?: string;
		animate?: boolean;
		delay?: number;
	} = $props();

	const total = $derived(Math.max(correct + partial + incorrect, 1));
	const pct = (n: number) => (n / total) * 100;
</script>

<div
	class="flex gap-[3px] {height}"
	role="img"
	aria-label="{correct} corretos, {partial} parciais, {incorrect} incorretos"
>
	{#if correct}
		<div
			class="rounded-full bg-success"
			style="width: {pct(correct)}%; {animate
				? `transform-origin:left; animation: en-grow-x 900ms var(--ease-out-soft) ${delay}ms both;`
				: ''}"
		></div>
	{/if}
	{#if partial}
		<div class="rounded-full bg-warning" style="width: {pct(partial)}%"></div>
	{/if}
	{#if incorrect}
		<div class="rounded-full bg-error" style="width: {pct(incorrect)}%"></div>
	{/if}
</div>
