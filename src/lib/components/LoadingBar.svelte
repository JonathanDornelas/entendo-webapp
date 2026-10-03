<script lang="ts">
	/**
	 * A barra de fila. **Não é uma variante de `Loading.svelte`** — é a espera de
	 * trabalho que está numa fila do servidor, onde forma girando prometeria que
	 * a tela está fazendo alguma coisa.
	 *
	 * O segmento atravessa e recomeça: diz que algo anda, sem dizer quanto falta.
	 * Se você não sabe quanto falta, não mostre porcentagem.
	 */
	let {
		label = '',
		pace = 'normal',
		class: className = ''
	}: {
		/** O que está na fila, em uma linha. Sem ele a barra não informa nada. */
		label?: string;
		pace?: 'normal' | 'devagar';
		class?: string;
	} = $props();

	const dur = $derived(pace === 'devagar' ? '2.98s' : '1.70s');
</script>

<div class={className}>
	<div
		role="status"
		aria-label={label || 'Na fila'}
		class="h-1.5 overflow-hidden rounded-full bg-base-300"
	>
		<div
			aria-hidden="true"
			class="h-full w-[30%] rounded-full bg-primary"
			style="animation: en-bar {dur} ease-in-out infinite;"
		></div>
	</div>
	{#if label}
		<p class="mt-2.5 text-[12.5px] leading-snug text-base-content/65">{label}</p>
	{/if}
</div>
