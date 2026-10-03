<script lang="ts">
	/**
	 * A troca de tema. Vive na home e no cabeçalho do Studio — o professor passa
	 * o dia no painel, que é justamente onde a escolha importa mais.
	 *
	 * **Nenhuma tela guarda tema por conta própria** (design-system.md "Tema"):
	 * quem persiste e aplica no `<html>` é `$lib/client/theme`, e o script
	 * inline de `app.html` já aplicou o valor antes da primeira pintura. Aqui só
	 * sincronizamos com o que está lá e alternamos.
	 */
	import { tema } from '$lib/client/theme.svelte';

	let { class: className = '' }: { class?: string } = $props();

	$effect(() => tema.sincronizar());
	const escuro = $derived(tema.atual === 'dark');
	const rotulo = $derived(escuro ? 'Tema claro' : 'Tema escuro');
</script>

<button
	type="button"
	onclick={() => tema.alternar()}
	class="btn btn-circle btn-ghost {className}"
	aria-label={rotulo}
	title={rotulo}
>
	{#if escuro}
		<svg class="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2" />
			<path
				d="M12 2.5v2.5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12h2.5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	{:else}
		<svg class="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
				stroke="currentColor"
				stroke-width="2"
				stroke-linejoin="round"
			/>
		</svg>
	{/if}
</button>
