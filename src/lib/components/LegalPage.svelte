<script lang="ts">
	// Página legal: índice fixo à esquerda no desktop, seções numeradas. Recebe
	// as seções de $lib/content/institucional.ts — o texto nunca fica na rota
	// (paginas.md "Grupo (site)").
	import SiteHero from './SiteHero.svelte';
	import type { LegalSection } from '$lib/content/institucional';

	let {
		eyebrow,
		title,
		lede,
		updated,
		sections
	}: {
		eyebrow: string;
		title: string;
		lede: string;
		updated?: string;
		sections: LegalSection[];
	} = $props();

	const numbered = $derived(
		sections.map((s, i) => ({ ...s, n: String(i + 1).padStart(2, '0'), id: `sec-${i + 1}` }))
	);
</script>

<SiteHero {eyebrow} {title} {lede} {updated} />

<div
	class="mx-auto grid w-full max-w-[1100px] gap-11 px-7 py-8 lg:grid-cols-[236px_minmax(0,1fr)] lg:px-10 lg:py-10"
>
	<nav class="hidden self-start lg:sticky lg:top-[84px] lg:block">
		<p class="mb-3 text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase">
			Nesta página
		</p>
		<div class="grid gap-0.5">
			{#each numbered as s (s.id)}
				<a
					href="#{s.id}"
					class="flex gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] leading-snug text-base-content/65
					       no-underline transition-colors hover:bg-base-200"
				>
					<span class="shrink-0 font-mono text-[11.5px] text-base-content/50">{s.n}</span>
					{s.t}
				</a>
			{/each}
		</div>
	</nav>

	<div class="max-w-[68ch] min-w-0">
		{#each numbered as s (s.id)}
			<section id={s.id} class="mb-[30px] scroll-mt-[90px]">
				<h2
					class="mb-3 flex gap-3 font-display text-lg font-semibold tracking-[-0.018em] lg:text-[21px]"
				>
					<span class="shrink-0 pt-[5px] font-mono text-[13px] font-normal text-primary">{s.n}</span
					>
					{s.t}
				</h2>

				{#each s.p as par (par)}
					<p
						class="mb-3 text-[14.5px] leading-[1.75] text-pretty text-base-content/65 lg:text-[15px]"
					>
						{par}
					</p>
				{/each}

				{#if s.l}
					<div class="mt-1 mb-3 grid gap-[7px]">
						{#each s.l as li (li)}
							<div class="flex gap-3 text-[14.5px] leading-relaxed text-base-content/65">
								<span class="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary"></span>
								<span class="min-w-0">{li}</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if s.note}
					<p
						class="mt-1 mb-3 rounded-box border border-s-[3px] border-line border-s-primary bg-base-200
						       px-4 py-3.5 text-[13.5px] leading-relaxed text-base-content/65"
					>
						{s.note}
					</p>
				{/if}
			</section>
		{/each}
	</div>
</div>
