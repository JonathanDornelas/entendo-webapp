<script lang="ts">
	import { resolve } from '$app/paths';
	import ScoreBar from '$lib/components/ScoreBar.svelte';
	import { withMock } from '$lib/dev/with-mock';

	interface ActivitySummary {
		id: string;
		title: string;
		attempts: number;
		correct: number;
		partial: number;
		incorrect: number;
		publishedAgo?: string;
	}
	interface PageData {
		publishedCount: number;
		totalAttempts: number;
		pendingCount: number;
		activities: ActivitySummary[];
	}

	const MOCK: PageData = {
		publishedCount: 2,
		totalAttempts: 27,
		pendingCount: 3,
		activities: [
			{
				id: 'atv_01',
				title: 'Present perfect — turma B',
				attempts: 18,
				correct: 71,
				partial: 18,
				incorrect: 11
			},
			{
				id: 'atv_02',
				title: 'Vocabulário — comida',
				attempts: 9,
				correct: 64,
				partial: 22,
				incorrect: 14
			},
			{
				id: 'atv_03',
				title: 'Diálogo — no restaurante',
				attempts: 0,
				correct: 0,
				partial: 0,
				incorrect: 0,
				publishedAgo: '2 dias'
			}
		] as ActivitySummary[]
	};

	let { data: dataProp }: { data?: Partial<PageData> } = $props();
	const data = $derived(withMock(dataProp, MOCK));
</script>

<svelte:head><title>Resultados — entendo</title></svelte:head>

<div class="px-7 py-[26px]">
	<div class="mb-[22px] flex items-end justify-between gap-4">
		<div>
			<h1 class="mb-1 font-display text-2xl font-semibold tracking-[-0.02em]">Resultados</h1>
			<p class="text-[13.5px] text-base-content/65">
				{data.publishedCount} atividades publicadas · {data.totalAttempts} tentativas
			</p>
		</div>
		{#if data.pendingCount}
			<!-- Não é link: o retorno é dado DENTRO da tentativa, ao lado das
			     outras respostas do mesmo aluno. Uma fila separada obrigava o
			     professor a decidir sem esse contexto. -->
			<span
				class="flex items-center gap-2 rounded-full bg-warning/12 px-3.5 py-2 text-[13px] font-bold whitespace-nowrap text-warning"
				title="Respostas de escrita por rubrica esperando seu retorno. Abra a atividade e depois a tentativa de quem respondeu."
			>
				<svg class="size-[15px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M4 20h4l11-11a2.83 2.83 0 10-4-4L4 16z"
						stroke="currentColor"
						stroke-width="2"
						stroke-linejoin="round"
					/>
				</svg>
				{data.pendingCount} a comentar
			</span>
		{/if}
	</div>

	<ul class="grid list-none gap-2.5 p-0">
		{#each data.activities as a (a.id)}
			<li>
				{#if a.attempts === 0}
					<div
						class="flex items-center gap-3.5 rounded-box border-[1.5px] border-dashed border-line bg-base-200 p-[18px]"
					>
						<div class="flex-1">
							<p class="mb-0.5 text-sm font-semibold">{a.title}</p>
							<p class="text-[12.5px] text-base-content/65">
								Publicada há {a.publishedAgo}, ainda sem nenhuma tentativa.
							</p>
						</div>
						<button type="button" class="p-2 text-[12.5px] font-bold whitespace-nowrap text-primary"
							>Copiar link</button
						>
					</div>
				{:else}
					<a
						href={resolve('/(studio)/resultados/[activityId]', { activityId: a.id })}
						class="block rounded-box border border-line p-[18px] no-underline transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary"
					>
						<div class="mb-3 flex items-baseline justify-between gap-3">
							<span class="text-[15px] font-semibold text-base-content">{a.title}</span>
							<span class="font-mono text-[13px] whitespace-nowrap text-base-content/65"
								>{a.attempts} tentativas</span
							>
						</div>
						<ScoreBar correct={a.correct} partial={a.partial} incorrect={a.incorrect} />
						<div class="mt-2.5 flex gap-4 text-[12.5px] text-base-content/65">
							<span><strong class="text-success">{a.correct}%</strong> certo</span>
							<span><strong class="text-warning">{a.partial}%</strong> parcial</span>
							<span><strong class="text-error">{a.incorrect}%</strong> errado</span>
						</div>
					</a>
				{/if}
			</li>
		{/each}
	</ul>
</div>
