<script lang="ts">
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { termos } from '$lib/content/institucional';
</script>

<svelte:head><title>As regras entre você e a entendo — entendo</title></svelte:head>

<LegalPage
	eyebrow="Termos de uso"
	title="As regras entre você e a entendo"
	lede="O que a plataforma promete, o que ela não promete e o que esperamos de quem usa."
	updated="Versão 1.8 · em vigor desde 12 de março de 2026"
	sections={termos}
/>
