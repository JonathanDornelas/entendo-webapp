<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'outline' | 'ghost' | 'neutral';
	type Size = 'sm' | 'md' | 'lg';

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		href,
		class: className = '',
		children,
		...rest
	}: {
		variant?: Variant;
		size?: Size;
		type?: HTMLButtonAttributes['type'];
		disabled?: boolean;
		href?: string;
		class?: string;
		children: Snippet;
	} & Record<string, unknown> = $props();

	const variants: Record<Variant, string> = {
		primary: 'btn-primary',
		outline: 'btn-outline',
		ghost: 'btn-ghost',
		neutral: 'btn-neutral'
	};
	const sizes: Record<Size, string> = {
		sm: 'btn-sm',
		md: '',
		lg: 'btn-lg'
	};
	// {...rest} depois de class="..." SUBSTITUI a classe inteira em vez de somar — por isso o
	// merge é manual aqui, não deixe pro spread.
	let classes = $derived(
		`btn motion-tap font-bold ${variants[variant]} ${sizes[size]} ${className}`
	);
</script>

{#if href}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href é prop genérica (rota já resolvida, âncora de hash ou URL externa/futura); resolve() exige literal no call site, não dá pra aplicar aqui dentro. -->
	<a {href} class={classes} {...rest}>
		{@render children()}
	</a>
{:else}
	<button {type} class={classes} {disabled} {...rest}>
		{@render children()}
	</button>
{/if}
