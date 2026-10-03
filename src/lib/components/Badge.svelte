<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'error';
	type Tone = 'soft' | 'solid' | 'outline';

	let {
		variant = 'neutral',
		tone = 'soft',
		children
	}: { variant?: Variant; tone?: Tone; children: Snippet } = $props();

	const soft: Record<Variant, string> = {
		neutral: 'bg-base-300 text-base-content',
		primary: 'bg-primary/10 text-primary',
		accent: 'bg-accent/10 text-accent',
		success: 'bg-success/10 text-success',
		warning: 'bg-warning/10 text-warning',
		error: 'bg-error/10 text-error'
	};
	const solid: Record<Variant, string> = {
		neutral: 'bg-base-content text-base-100',
		primary: 'bg-primary text-primary-content',
		accent: 'bg-accent text-accent-content',
		success: 'bg-success text-success-content',
		warning: 'bg-warning text-warning-content',
		error: 'bg-error text-error-content'
	};
	const outline: Record<Variant, string> = {
		neutral: 'border border-line text-base-content/60',
		primary: 'border border-primary text-primary',
		accent: 'border border-accent text-accent',
		success: 'border border-success text-success',
		warning: 'border border-warning text-warning',
		error: 'border border-error text-error'
	};
	const tones = { soft, solid, outline };
</script>

<span
	class="inline-flex items-center gap-1 rounded-selector px-2.5 py-1 text-[12px] font-bold
	       whitespace-nowrap {tones[tone][variant]}"
>
	{@render children()}
</span>
