<script lang="ts">
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { acessibilidade } from '$lib/content/institucional';
</script>

<svelte:head><title>O que já funciona e o que ainda não — entendo</title></svelte:head>

<LegalPage
	eyebrow="Acessibilidade"
	title="O que já funciona e o que ainda não"
	lede="Declaração de conformidade com WCAG 2.1 AA, incluindo as barreiras que ainda existem."
	updated="Atualizado em 12 de março de 2026"
	sections={acessibilidade}
/>
