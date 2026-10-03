<script lang="ts">
	// Stepper do wizard "Nova atividade". Etapa concluída vira check verde —
	// ver .claude/rules/paginas.md "Studio" para o fluxo completo.
	let { current = 1 }: { current?: number } = $props();
	const steps = ['Detalhes', 'Materiais', 'Revisar', 'Publicar'];
</script>

<div class="flex flex-1 items-center justify-center gap-1.5">
	{#each steps as label, i (label)}
		{@const n = i + 1}
		{#if i > 0}<span class="h-px w-6 bg-line"></span>{/if}
		{#if n < current}
			<span class="flex items-center gap-2 px-3 py-[7px] text-[13px] font-semibold text-success">
				<svg class="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
					<path
						d="M8 12.5l2.5 2.5L16 9.5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				{label}
			</span>
		{:else if n === current}
			<span
				class="flex items-center gap-2 rounded-full bg-base-300 px-3.5 py-[7px] text-[13px] font-bold text-primary"
				aria-current="step"
			>
				<span
					class="grid size-[18px] place-items-center rounded-full bg-primary text-[11px] text-primary-content"
				>
					{n}
				</span>
				{label}
			</span>
		{:else}
			<span
				class="flex items-center gap-2 px-3 py-[7px] text-[13px] font-semibold text-base-content/60"
			>
				<span
					class="grid size-[18px] place-items-center rounded-full border-[1.5px] border-line text-[11px]"
				>
					{n}
				</span>
				{label}
			</span>
		{/if}
	{/each}
</div>
