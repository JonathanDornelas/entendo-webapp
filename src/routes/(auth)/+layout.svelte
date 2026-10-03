<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import AmbientShapes from '$lib/components/AmbientShapes.svelte';

	let { children } = $props();
</script>

<div class="relative flex min-h-screen flex-col bg-base-200">
	<AmbientShapes edges="both" />
	<header class="relative z-1 px-8 py-5"><Logo /></header>
	<main class="relative z-1 flex flex-1 items-center justify-center px-6 pb-16">
		{@render children()}
	</main>
</div>
