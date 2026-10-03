<script lang="ts">
	type State = 'correct' | 'partial' | 'incorrect' | 'pending';

	// Ícone isolado dos quatro estados, para listas compactas (fila de resultados,
	// linha de resposta) onde o bloco completo de CorrectionState.svelte é pesado
	// demais. Cor nunca sozinha — quem usa este componente sempre põe texto ao lado.
	let {
		state = 'correct',
		size = 22,
		animate = false
	}: { state?: State; size?: number; animate?: boolean } = $props();

	const tone: Record<State, string> = {
		correct: 'text-success',
		partial: 'text-warning',
		incorrect: 'text-error',
		pending: 'text-base-content/60'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	class="shrink-0 {tone[state]}"
	aria-hidden="true"
>
	{#if state === 'correct'}
		<circle
			cx="12"
			cy="12"
			r="9"
			stroke="currentColor"
			stroke-width="2"
			opacity={animate ? 0.4 : 1}
		/>
		<path
			d="M7.5 12.5l3 3 6-6.5"
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray={animate ? 34 : undefined}
			class={animate ? 'animate-[en-draw_700ms_var(--ease-out-soft)_both]' : ''}
		/>
	{:else if state === 'partial'}
		<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
		<path d="M12 3a9 9 0 010 18z" fill="currentColor" />
	{:else if state === 'incorrect'}
		<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
		<path
			d="M8.5 8.5l7 7M15.5 8.5l-7 7"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/>
	{:else}
		<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3.5" />
	{/if}
</svg>
