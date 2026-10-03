<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import NavigationProgress from '$lib/components/NavigationProgress.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<!-- Uma vez só, no layout raiz: toda troca de tela do produto passa por aqui,
     inclusive as do Player, que resetam o layout com `+page@.svelte`. -->
<NavigationProgress />
{@render children()}
