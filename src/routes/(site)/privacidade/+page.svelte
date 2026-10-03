<script lang="ts">
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { privacidade } from '$lib/content/institucional';
</script>

<svelte:head
	><title>O que fazemos com os dados de professores e alunos — entendo</title></svelte:head
>

<LegalPage
	eyebrow="Política de privacidade"
	title="O que fazemos com os dados de professores e alunos"
	lede="Escrita em português claro e organizada pela ordem das perguntas que a gente mais recebe. Sem letra miúda escondida."
	updated="Versão 2.1 · em vigor desde 12 de março de 2026"
	sections={privacidade}
/>
