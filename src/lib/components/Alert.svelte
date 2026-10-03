<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'info' | 'warning' | 'error' | 'success';

	let { variant = 'info', children }: { variant?: Variant; children: Snippet } = $props();

	const accent: Record<Variant, string> = {
		info: 'border-s-primary text-primary',
		warning: 'border-s-warning text-warning',
		error: 'border-s-error text-error',
		success: 'border-s-success text-success'
	};
</script>

<div
	class="flex gap-3 rounded-field border border-s-[3px] border-line bg-base-200 p-3.5 {accent[
		variant
	]}"
>
	{#if variant === 'warning'}
		<svg class="size-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M12 3.5l9.5 16.5H2.5z"
				stroke="currentColor"
				stroke-width="2"
				stroke-linejoin="round"
			/>
			<path
				d="M12 9.5v4.5M12 17h.01"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	{:else if variant === 'error'}
		<svg class="size-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
			<path
				d="M8.5 8.5l7 7M15.5 8.5l-7 7"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	{:else if variant === 'success'}
		<svg class="size-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M5 12.5l4.5 4.5L19 7"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else}
		<svg class="size-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
			<path
				d="M12 11v5.5M12 7.5h.01"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	{/if}
	<div class="text-[14px] leading-relaxed text-base-content">
		{@render children()}
	</div>
</div>
