<script lang="ts">
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { cookies } from '$lib/content/institucional';
</script>

<svelte:head><title>Quais cookies usamos e por quê — entendo</title></svelte:head>

<LegalPage
	eyebrow="Cookies"
	title="Quais cookies usamos e por quê"
	lede="Lista completa, um por um, com prazo de validade e finalidade. Nenhum cookie de publicidade."
	updated="Atualizado em 12 de março de 2026"
	sections={cookies}
/>
