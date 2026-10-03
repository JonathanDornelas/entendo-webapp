<script lang="ts">
	import type { ChoiceRuntimeItem } from './types';

	// Alternativas do idioma alvo: font-content + dir do LanguageProfile.
	let {
		item,
		value = $bindable(null),
		desktop = false
	}: { item: ChoiceRuntimeItem; value?: string | null; desktop?: boolean } = $props();
</script>

<p class="mb-3.5 text-[12.5px] font-semibold text-base-content/65">Escolha uma resposta</p>

<div class="grid gap-2.5 {desktop ? 'gap-3' : ''}">
	{#each item.options as opt, i (opt.id)}
		<button
			type="button"
			onclick={() => (value = opt.id)}
			aria-pressed={value === opt.id}
			dir={item.dir}
			class="flex min-h-12 items-center gap-4 rounded-box border-[1.5px] border-b-[3px] px-4 py-3.5 text-start
			       font-content transition-[transform,border-color,box-shadow] duration-150
			       hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-[1.5px]
			       {desktop ? 'min-h-16 px-5 py-[18px] text-[19px]' : 'text-[17px]'}
			       {value === opt.id
				? 'border-primary bg-base-300 text-primary'
				: 'border-line bg-base-100 hover:border-primary hover:shadow-[0_12px_24px_-18px_color-mix(in_oklab,var(--color-primary)_80%,transparent)]'}"
		>
			{#if desktop}
				<span
					class="grid size-[30px] shrink-0 place-items-center rounded-lg font-mono text-[13px]
					       {value === opt.id
						? 'bg-primary text-primary-content'
						: 'border border-line bg-base-200 text-base-content/65'}"
				>
					{i + 1}
				</span>
			{/if}
			{opt.text}
		</button>
	{/each}
</div>
