<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		label,
		value = $bindable(''),
		error = '',
		hint = '',
		class: className = '',
		...rest
	}: {
		label: string;
		value?: string;
		error?: string;
		hint?: string;
		class?: string;
	} & HTMLInputAttributes = $props();

	const id = $props.id();
	// {...rest} depois de class="..." SUBSTITUI a classe inteira em vez de somar — merge manual.
	let classes = $derived(`input w-full ${error ? 'input-error' : ''} ${className}`);
</script>

<fieldset class="fieldset w-full">
	<legend class="fieldset-legend">{label}</legend>
	<input
		{id}
		bind:value
		class={classes}
		aria-invalid={!!error}
		aria-describedby={error ? `${id}-err` : undefined}
		{...rest}
	/>
	{#if error}
		<p
			id="{id}-err"
			class="flex items-center gap-2 fieldset-label text-[12.5px] font-semibold text-error"
		>
			<svg class="size-[15px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
				<path
					d="M12 7.5v6M12 16.5h.01"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
			{error}
		</p>
	{:else if hint}
		<p class="fieldset-label text-[12.5px]">{hint}</p>
	{/if}
</fieldset>
