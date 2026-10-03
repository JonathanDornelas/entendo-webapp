<script lang="ts">
	// Status: estado por serviço e histórico. Estado nunca é comunicado só por
	// cor (design-system.md). Fonte real do status é pendência de produto — ver
	// paginas.md "Grupo (site)", hoje é estático.
	import { resolve } from '$app/paths';
	import SiteHero from '$lib/components/SiteHero.svelte';
	import { servicos, incidentes, type ServiceTone } from '$lib/content/institucional';

	const ponto: Record<ServiceTone, string> = {
		ok: 'bg-success',
		part: 'bg-warning',
		err: 'bg-error',
		mute: 'bg-base-content/40'
	};
	const pilula: Partial<Record<ServiceTone, string>> = {
		ok: 'text-success bg-success/15',
		part: 'text-warning bg-warning/15'
	};
</script>

<svelte:head><title>Status — entendo</title></svelte:head>

<SiteHero
	eyebrow="Status"
	title="Como os serviços estão agora"
	lede="Publicamos incidente mesmo quando ninguém percebeu. Manutenção programada é anunciada com 48 horas."
/>

<div class="mx-auto w-full max-w-[1100px] px-7 py-8 lg:px-10 lg:py-10">
	<div
		class="mb-[26px] flex flex-wrap items-center gap-3.5 rounded-box border border-success/35 bg-success/10 px-5 py-4"
	>
		<span
			class="size-[11px] shrink-0 animate-[en-pulse-ring_2.4s_ease-out_infinite] rounded-full bg-success"
		></span>
		<div class="min-w-[200px] flex-1">
			<p class="mb-1 font-display text-[19px] font-semibold text-success">
				Todos os sistemas operando
			</p>
			<p class="text-[13px] text-base-content/65">
				Última verificação há 40 segundos · atualiza a cada minuto
			</p>
		</div>
		<a
			href={resolve('/(site)/contato')}
			class="btn btn-sm motion-tap btn-outline font-bold no-underline"
		>
			Assinar avisos
		</a>
	</div>

	<p class="mb-3 text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase">
		Serviços
	</p>
	<div class="mb-[30px] grid gap-2">
		{#each servicos as sv (sv.name)}
			<div
				class="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-box border border-line bg-base-100 px-4 py-3.5"
			>
				<span class="size-[9px] shrink-0 rounded-full {ponto[sv.tone]}"></span>
				<span class="shrink-0 text-[14.5px] font-semibold">{sv.name}</span>
				<span class="min-w-[40px] flex-1 text-[12.5px] text-base-content/65">{sv.note}</span>
				<span
					class="shrink-0 rounded-full px-2.5 py-[5px] text-xs font-bold whitespace-nowrap {pilula[
						sv.tone
					] ?? 'bg-base-300 text-base-content/65'}"
				>
					{sv.state}
				</span>
				<span class="shrink-0 font-mono text-xs text-base-content/65">{sv.uptime} · 90d</span>
			</div>
		{/each}
	</div>

	<p class="mb-3 text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase">
		Histórico recente
	</p>
	<div>
		{#each incidentes as inc (inc.date)}
			<div class="flex min-w-0 gap-4">
				<div class="flex w-3 shrink-0 flex-col items-center">
					<span class="mt-[5px] size-2.5 shrink-0 rounded-full {ponto[inc.tone]}"></span>
					<span class="w-px flex-1 bg-line"></span>
				</div>
				<div class="min-w-0 pb-5">
					<p class="mb-1 font-mono text-xs text-base-content/65">{inc.date}</p>
					<p class="mb-1 text-[14.5px] font-semibold">{inc.title}</p>
					<p class="max-w-[72ch] text-[13px] leading-relaxed text-pretty text-base-content/65">
						{inc.body}
					</p>
				</div>
			</div>
		{/each}
	</div>
</div>
