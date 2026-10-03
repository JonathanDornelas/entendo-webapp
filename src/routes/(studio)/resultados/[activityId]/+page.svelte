<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Pagination from '$lib/components/Pagination.svelte';
	import ScoreBar from '$lib/components/ScoreBar.svelte';
	import { withMock } from '$lib/dev/with-mock';

	type ItemState = 'correct' | 'partial' | 'incorrect' | 'empty';
	interface ItemStat {
		id: string;
		index: number;
		interactionLabel: string;
		correct: number;
		partial: number;
		incorrect: number;
	}
	interface AttemptRow {
		id: string;
		initials: string;
		name: string;
		when: string;
		duration: string;
		itemStates: ItemState[];
	}
	interface Stat {
		value: string;
		label: string;
		tone?: string;
	}

	interface PageData {
		activity: { id: string; title: string; noAr: boolean };
		stats: Stat[];
		items: ItemStat[];
		attempts: AttemptRow[];
		pendingWriting: number;
	}

	const MOCK: PageData = {
		activity: {
			id: page.params.activityId ?? 'atv_01',
			title: 'Present perfect — turma B',
			noAr: true
		},
		stats: [
			{ value: '18', label: 'tentativas' },
			{ value: '71%', label: 'acerto médio', tone: 'text-success' },
			{ value: '3', label: 'writing a corrigir', tone: 'text-warning' }
		] as Stat[],
		items: [
			{
				id: 'itm_01',
				index: 1,
				interactionLabel: 'assemble',
				correct: 88,
				partial: 8,
				incorrect: 4
			},
			{
				id: 'itm_02',
				index: 2,
				interactionLabel: 'choice',
				correct: 79,
				partial: 12,
				incorrect: 9
			},
			{
				id: 'itm_03',
				index: 3,
				interactionLabel: 'type',
				correct: 52,
				partial: 31,
				incorrect: 17
			}
		] as ItemStat[],
		attempts: [
			{
				id: 'att_01',
				initials: 'JM',
				name: 'João M.',
				when: 'há 2h',
				duration: '6min',
				itemStates: ['correct', 'correct', 'partial', 'incorrect', 'correct']
			},
			{
				id: 'att_02',
				initials: 'LC',
				name: 'Luiza C.',
				when: 'ontem',
				duration: '8min',
				itemStates: ['correct', 'partial', 'correct', 'correct', 'empty']
			}
		] as AttemptRow[],
		pendingWriting: 3
	};

	let { data: dataProp }: { data?: Partial<PageData> } = $props();
	const data = $derived(withMock(dataProp, MOCK));

	// Uma turma inteira respondendo gera dezenas de tentativas; a coluna da
	// direita não é lugar para uma lista infinita.
	let pagina = $state(1);
	const POR_PAGINA = 10;
	const naPagina = $derived(data.attempts.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA));

	const stateColor: Record<ItemState, string> = {
		correct: 'bg-success',
		partial: 'bg-warning',
		incorrect: 'bg-error',
		empty: 'bg-base-300'
	};
</script>

<svelte:head><title>{data.activity.title} — resultados</title></svelte:head>

<div>
	<div class="flex flex-wrap items-center gap-3.5 border-b border-line px-[30px] py-[18px]">
		<a
			href={resolve('/(studio)/resultados')}
			class="flex items-center gap-2 py-2 text-[13.5px] font-semibold text-base-content/65 no-underline transition-transform hover:-translate-x-0.5"
		>
			<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M15 5l-7 7 7 7"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			Resultados
		</a>
		<h1 class="font-display text-[22px] font-semibold tracking-[-0.02em]">{data.activity.title}</h1>
		{#if data.activity.noAr}
			<span
				class="rounded-full bg-primary px-[11px] py-[5px] text-xs font-bold whitespace-nowrap text-primary-content"
			>
				No ar
			</span>
		{/if}
		<div class="flex-1"></div>
		<span class="btn btn-sm motion-tap btn-neutral font-semibold">Exportar CSV</span>
	</div>

	<div class="grid lg:grid-cols-[1fr_380px]">
		<div class="border-e border-line px-[30px] py-[26px]">
			<div class="mb-7 flex flex-wrap gap-7">
				{#each data.stats as stat (stat.label)}
					<div>
						<div
							class="font-display text-[34px] leading-none font-extrabold tracking-[-0.025em] {stat.tone ??
								''}"
						>
							{stat.value}
						</div>
						<div class="mt-1.5 text-[12.5px] text-base-content/65">{stat.label}</div>
					</div>
				{/each}
			</div>

			<p class="mb-3.5 text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase">
				Itens ordenados por dificuldade
			</p>
			<div class="grid gap-3.5">
				{#each data.items as item, i (item.id)}
					<div>
						<div class="mb-[7px] flex items-baseline justify-between text-[13.5px]">
							<span>Item {item.index} · {item.interactionLabel}</span>
							<span class="font-mono text-base-content/65">{item.correct}% certo</span>
						</div>
						<ScoreBar
							correct={item.correct}
							partial={item.partial}
							incorrect={item.incorrect}
							height="h-[9px]"
							delay={i * 80}
						/>
					</div>
				{/each}
			</div>

			<div
				class="mt-[22px] flex items-center gap-4 border-t border-line pt-4 text-[12.5px] text-base-content/65"
			>
				<span class="flex items-center gap-1.5"
					><span class="size-2.5 rounded-[3px] bg-success"></span>certo</span
				>
				<span class="flex items-center gap-1.5"
					><span class="size-2.5 rounded-[3px] bg-warning"></span>parcial</span
				>
				<span class="flex items-center gap-1.5"
					><span class="size-2.5 rounded-[3px] bg-error"></span>errado</span
				>
				<span class="flex-1"></span>
				<span>Parcial tem faixa própria — nunca somado ao erro.</span>
			</div>
		</div>

		<aside class="bg-base-200 p-[26px]">
			<div class="mb-3.5 flex items-baseline justify-between">
				<span class="text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase"
					>Tentativas recentes</span
				>
				<span class="text-[12.5px] text-base-content/65">{data.attempts.length}</span>
			</div>
			<ul class="grid list-none gap-[7px] p-0">
				{#each naPagina as at (at.id)}
					<li>
						<a
							href={resolve('/(studio)/resultados/[activityId]/[attemptId]', {
								activityId: data.activity.id,
								attemptId: at.id
							})}
							class="flex items-center gap-[11px] rounded-field border border-line bg-base-100 px-3.5 py-3 no-underline transition-colors hover:border-primary"
						>
							<span
								class="grid size-7 shrink-0 place-items-center rounded-full bg-base-300 text-[10.5px] font-bold text-primary"
							>
								{at.initials}
							</span>
							<span class="min-w-0 flex-1">
								<span class="block text-[13.5px] font-semibold text-base-content">{at.name}</span>
								<span class="block text-[11.5px] text-base-content/65"
									>{at.when} · {at.duration}</span
								>
							</span>
							<span class="flex gap-0.5" aria-label="Resumo por item">
								{#each at.itemStates as s, i (i)}
									<span class="h-4 w-[5px] rounded-sm {stateColor[s]}"></span>
								{/each}
							</span>
						</a>
					</li>
				{/each}
			</ul>

			<Pagination
				bind:pagina
				porPagina={POR_PAGINA}
				total={data.attempts.length}
				rotulo="tentativas"
			/>

			{#if data.pendingWriting}
				<!-- Não leva a lugar nenhum de propósito: o retorno é dado DENTRO da
				     tentativa, ao lado das outras respostas do mesmo aluno — que é o
				     que a fila separada impedia. -->
				<div
					class="mt-3.5 flex items-center gap-2.5 rounded-field border border-s-[3px] border-line border-s-warning bg-base-100 px-3.5 py-3"
				>
					<svg
						class="size-[17px] shrink-0 text-warning"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M4 20h4l11-11a2.83 2.83 0 10-4-4L4 16z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/>
					</svg>
					<span class="flex-1 text-[13px] leading-snug text-base-content">
						{data.pendingWriting}
						{data.pendingWriting === 1 ? 'resposta escrita espera' : 'respostas escritas esperam'} seu
						retorno — abra a tentativa de quem respondeu.
					</span>
				</div>
			{/if}
		</aside>
	</div>
</div>
