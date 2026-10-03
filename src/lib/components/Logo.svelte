<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		size = 24,
		showWordmark = true,
		sub
	}: { size?: number; showWordmark?: boolean; sub?: string } = $props();
</script>

<a href={resolve('/')} class="flex items-center gap-2.5 text-base-content no-underline">
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		class="text-primary"
		aria-hidden="true"
	>
		<rect x="1.5" y="2.5" width="21" height="15" rx="4" stroke="currentColor" stroke-width="2" />
		<path
			d="M7 21.5L11 17.5M7 10h10M7 14h6"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/>
	</svg>
	{#if showWordmark}
		<span class="font-display font-extrabold tracking-tight" style="font-size: {size * 0.78}px">
			entendo
		</span>
	{/if}
	{#if sub}
		<span class="border-s border-line ps-3 text-sm text-base-content/65">{sub}</span>
	{/if}
</a>
