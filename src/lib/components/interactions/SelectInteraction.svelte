<script lang="ts">
	import type { SelectRuntimeItem } from './types';

	// Selecionar trecho DENTRO do texto. Os trechos vêm pré-marcados pelo item —
	// o aluno não arrasta para escolher palavra por palavra.
	let { item, value = $bindable(null) }: { item: SelectRuntimeItem; value?: string | null } =
		$props();
</script>

<p class="mb-4 text-[13.5px] leading-snug text-base-content/65">
	Selecione o trecho dentro do texto.
</p>

<p
	dir={item.dir}
	class="rounded-box border border-line bg-base-200 p-4 font-content text-[17px] leading-[2.1]"
>
	{#each item.segments as seg (seg.id)}
		{#if seg.selectable}
			<button
				type="button"
				onclick={() => (value = seg.id)}
				aria-pressed={value === seg.id}
				class="rounded-lg [box-decoration-break:clone] px-1.5 py-1 transition-colors
				       {value === seg.id
					? 'border-[1.5px] border-primary bg-base-300 font-semibold text-primary'
					: 'border-[1.5px] border-dashed border-line hover:border-primary'}"
			>
				{seg.text}
			</button>
		{:else}
			{seg.text}
		{/if}
	{/each}
</p>

<p
	class="mt-4 flex items-center gap-2.5 rounded-field border border-line bg-base-200 px-3.5 py-3
	       text-[12.5px] leading-snug text-base-content/65"
>
	Tab percorre os trechos, Enter seleciona.
</p>
