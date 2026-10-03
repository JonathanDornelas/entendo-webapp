<script lang="ts">
	// Hero das páginas institucionais: rótulo, título, lede e as formas de
	// ambiente. Confinadas a uma faixa lateral sem texto, per design-system.md.
	let {
		eyebrow,
		title,
		lede,
		updated
	}: { eyebrow: string; title: string; lede: string; updated?: string } = $props();
</script>

<section class="relative overflow-hidden border-b border-line bg-base-200">
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-y-0 end-0 -z-1 hidden w-[420px]
		       [mask-image:linear-gradient(to_left,#000_34%,transparent_92%)] lg:block"
	>
		<div
			class="absolute end-[-6%] top-[-26%] size-[150px] animate-[en-float-b_24s_ease-in-out_infinite]
			       rounded-full bg-[radial-gradient(circle_at_38%_34%,var(--color-primary),transparent_70%)] opacity-20"
		></div>
		<div
			class="absolute end-[26%] bottom-[-22%] h-[86px] w-24 animate-[en-float-a_20s_ease-in-out_infinite]
			       bg-accent/15 [clip-path:polygon(50%_0%,100%_100%,0%_100%)]"
		></div>
		<div
			class="absolute end-[8%] bottom-[14%] size-[62px] animate-[en-drift-spin_30s_ease-in-out_infinite]
			       bg-primary/10 [clip-path:polygon(25%_3%,75%_3%,100%_50%,75%_97%,25%_97%,0%_50%)]"
		></div>
		<div
			class="absolute end-[44%] top-[22%] size-[34px] animate-[en-spin_36s_linear_infinite] rounded-full
			       border-[1.5px] border-dashed border-primary/25"
		></div>
		<div
			class="absolute end-[18%] top-[40%] size-[13px] animate-[en-breathe_7s_ease-in-out_infinite] rounded-full bg-accent/30"
		></div>
	</div>

	<div class="relative mx-auto w-full max-w-[1100px] px-7 py-8 lg:px-10 lg:pt-[46px] lg:pb-10">
		<p class="mb-3 text-[11px] font-bold tracking-[0.09em] text-primary uppercase">{eyebrow}</p>
		<h1
			class="mb-3 max-w-[20ch] font-display text-[27px] leading-[1.14] font-semibold tracking-[-0.024em]
			       lg:text-[40px] lg:leading-[1.08]"
		>
			{title}
		</h1>
		<p
			class="max-w-[62ch] text-[14.5px] leading-relaxed text-pretty text-base-content/65 lg:text-base"
		>
			{lede}
		</p>
		{#if updated}
			<p
				class="mt-[18px] inline-flex items-center gap-2 rounded-full border border-line bg-base-100 px-3.5 py-[7px] text-[12.5px] text-base-content/65"
			>
				<svg class="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
					<path
						d="M12 7.5V12l3 2"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				{updated}
			</p>
		{/if}
	</div>
</section>
