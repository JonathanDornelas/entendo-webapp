<script lang="ts">
	// Pré-visualizar tudo — a etapa 4 manda para cá. Cada item é renderizado
	// pelos MESMOS componentes do Player, a partir do mesmo payload de
	// `toRuntime()`: o que aparece aqui é exatamente o que chega no browser do
	// aluno (regra inviolável 1). Nada é enviado nem corrigido.
	// `+page@.svelte` reseta para o layout raiz.
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { withMock } from '$lib/dev/with-mock';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import AssembleInteraction from '$lib/components/interactions/AssembleInteraction.svelte';
	import ChoiceInteraction from '$lib/components/interactions/ChoiceInteraction.svelte';
	import ClozeInteraction from '$lib/components/interactions/ClozeInteraction.svelte';
	import MatchInteraction from '$lib/components/interactions/MatchInteraction.svelte';
	import OrderInteraction from '$lib/components/interactions/OrderInteraction.svelte';
	import SelectInteraction from '$lib/components/interactions/SelectInteraction.svelte';
	import SpeakInteraction from '$lib/components/interactions/SpeakInteraction.svelte';
	import WritingInteraction from '$lib/components/interactions/WritingInteraction.svelte';
	import type {
		AssembleRuntimeItem,
		ChoiceRuntimeItem,
		ClozeRuntimeItem,
		Dir,
		MatchPair,
		MatchRuntimeItem,
		OrderRuntimeItem,
		SelectRuntimeItem,
		SpeakRuntimeItem,
		WritingRuntimeItem
	} from '$lib/components/interactions/types';
	import type { InteractionKind } from '$lib/kernel/interactions/types';

	/**
	 * A forma que `buildRuntimeItem` devolve. O índice aberto no fim existe
	 * porque cada interação acrescenta campos próprios (`options`, `tokens`,
	 * `masked`…) — nunca `any`: o que cada componente exige está tipado nos
	 * `satisfies` abaixo.
	 */
	interface RuntimeItem {
		dir: Dir;
		interaction: InteractionKind;
		prompt: string;
		passage?: string;
		skillLabel: string;
		audio?: string;
		gradedLater?: boolean;
		[extra: string]: unknown;
	}
	interface PreviewItem {
		index: number;
		id: string;
		/** `null` quando o payload do item não valida — ver o loader. */
		runtime: RuntimeItem | null;
		incompleto: boolean;
	}
	interface PageData {
		activity: { id: string; title: string };
		rascunho: boolean;
		/** Para onde o "Fechar" volta — token de lista fechada, nunca uma URL. */
		voltarPara: 'detalhe' | 'publicar';
		items: PreviewItem[];
	}

	const MOCK: PageData = {
		activity: { id: page.params.id ?? 'atv_01', title: 'Present perfect — turma B' },
		rascunho: true,
		voltarPara: 'publicar' as const,
		items: [
			{
				index: 1,
				id: 'itm_01',
				incompleto: false,
				runtime: {
					dir: 'ltr',
					interaction: 'cloze',
					prompt: 'Complete a frase.',
					skillLabel: 'Writing',
					masked: 'She ___ ___ working here since 2019.'
				}
			}
		] as PreviewItem[]
	};

	let { data: dataProp }: { data?: Partial<PageData> } = $props();
	const data = $derived(withMock(dataProp, MOCK));

	/**
	 * A prévia é uma tela FECHADA sobre de onde veio: sem barra lateral, sem
	 * Stepper, e o único jeito de sair é o X (ou Esc). Os dois destinos são
	 * literais aqui — `resolve()` exige literal no call site, e a lista fechada
	 * é o que impede um `?voltar=` virar redirecionamento aberto.
	 */
	const fechar = $derived(
		data.voltarPara === 'detalhe'
			? resolve('/(studio)/atividades/[id]', { id: data.activity.id })
			: resolve('/(studio)/atividades/[id]/publicar', { id: data.activity.id })
	);

	// Esc fecha, como em qualquer sobreposição. O link continua sendo o
	// caminho visível — o atalho é a conveniência, nunca a única saída.
	function aoTeclar(e: KeyboardEvent) {
		if (e.key === 'Escape') goto(fechar);
	}

	// Um estado por item, só para os componentes serem manipuláveis de verdade
	// na prévia. Nada disso é enviado — não existe tentativa nesta tela.
	//
	// Precisa nascer PREENCHIDO: `bind:` num valor `undefined` estoura quando a
	// prop do componente tem valor padrão, e a inicialização preguiçosa chegaria
	// tarde demais (o primeiro render acontece antes de qualquer efeito).
	interface Resposta {
		texto: string;
		escolha: string;
		montagem: string[];
		selecao: string;
		pares: MatchPair[];
		ordem: string[];
		gravando: boolean;
	}
	const resposta = $state<Record<string, Resposta>>(
		Object.fromEntries(
			untrack(() => data.items).map((item) => [
				item.id,
				{ texto: '', escolha: '', montagem: [], selecao: '', pares: [], ordem: [], gravando: false }
			])
		)
	);

	// `as` explícito por interação: o runtime é um índice aberto (cada
	// interação acrescenta campos próprios) e cada componente exige a sua
	// forma. O `satisfies` no call site é quem garante que não passou lixo.
	const comoChoice = (r: RuntimeItem) => r as unknown as ChoiceRuntimeItem;
	const comoAssemble = (r: RuntimeItem) => r as unknown as AssembleRuntimeItem;
	const comoCloze = (r: RuntimeItem) => r as unknown as ClozeRuntimeItem;
	const comoMatch = (r: RuntimeItem) => r as unknown as MatchRuntimeItem;
	const comoOrder = (r: RuntimeItem) => r as unknown as OrderRuntimeItem;
	const comoSelect = (r: RuntimeItem) => r as unknown as SelectRuntimeItem;
	const comoSpeak = (r: RuntimeItem) => r as unknown as SpeakRuntimeItem;
</script>

<svelte:head><title>Prévia — entendo</title></svelte:head>

<svelte:window onkeydown={aoTeclar} />

<div class="min-h-screen bg-base-200">
	<header
		class="sticky top-0 z-10 flex flex-wrap items-center gap-3.5 border-b border-line bg-base-100 px-4 py-3.5 lg:px-8"
	>
		<!-- FECHAR, não "voltar para a etapa X": esta tela é uma sobreposição
		     sobre de onde você veio, e o X é o que diz isso. O destino é o token
		     que o loader validou (`voltarPara`) — a prévia é aberta tanto do
		     wizard quanto da tela de detalhes, e antes ela devolvia todo mundo
		     para o wizard. -->
		<a
			href={fechar}
			class="grid size-[2.1rem] shrink-0 place-items-center rounded-full bg-base-200 text-base-content no-underline transition-[background,transform] hover:bg-base-300 active:scale-90"
			aria-label="Fechar a prévia"
			title="Fechar (Esc)"
		>
			<svg class="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M6 6l12 12M18 6L6 18"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
				/>
			</svg>
		</a>
		<span class="min-w-0 truncate font-display text-[17px] font-semibold"
			>{data.activity.title}</span
		>
		<span
			class="rounded-full border border-line px-2.5 py-1 text-xs font-bold whitespace-nowrap text-base-content/65"
		>
			{data.rascunho ? 'rascunho' : 'publicada'}
		</span>
		<div class="flex-1"></div>
		<span class="text-[12.5px] text-base-content/65">
			{data.items.length} itens · nada é enviado
		</span>
	</header>

	<div class="mx-auto grid max-w-[760px] gap-4 px-4 py-6 lg:py-8">
		<p class="text-[13.5px] leading-relaxed text-base-content/65">
			Cada item abaixo saiu de <span class="font-mono text-[12.5px]">toRuntime()</span> — é o mesmo payload
			que vai para o browser do aluno. O gabarito não está em nenhum deles.
		</p>

		{#each data.items as item (item.id)}
			{#if !item.runtime}
				<section
					class="min-w-0 rounded-box border border-s-[3px] border-line border-s-warning bg-base-100 p-5"
				>
					<p class="mb-1.5 text-sm font-semibold">
						Item {item.index} está incompleto
					</p>
					<p class="mb-3 text-[13px] leading-snug text-base-content/65">
						Os campos deste item não formam um exercício válido ainda — ele não vai para o aluno
						assim.
					</p>
					<a
						href={resolve('/(studio)/atividades/[id]/itens/[itemId]', {
							id: data.activity.id,
							itemId: item.id
						})}
						class="text-[13px] font-bold text-primary no-underline">Abrir no editor</a
					>
				</section>
			{:else}
				{@const r = item.runtime}
				<section class="min-w-0 rounded-box border border-line bg-base-100 p-5 lg:p-6">
					<div class="mb-3 flex items-center gap-2.5">
						<span class="font-mono text-[12px] text-base-content/60">{item.index}</span>
						<span class="text-[10.5px] font-bold tracking-[0.08em] text-primary uppercase"
							>{r.skillLabel} · {r.interaction}</span
						>
						<div class="flex-1"></div>
						<a
							href={resolve('/(studio)/atividades/[id]/itens/[itemId]', {
								id: data.activity.id,
								itemId: item.id
							})}
							class="p-1.5 text-[12.5px] font-semibold text-base-content/65 no-underline hover:text-base-content"
							>Editar</a
						>
					</div>

					<p class="mb-3.5 font-display text-xl leading-tight font-semibold tracking-[-0.02em]">
						{r.prompt}
					</p>

					{#if r.audio}
						<div class="mb-4"><AudioPlayer src={r.audio} /></div>
					{/if}

					{#if r.passage}
						<div class="mb-4 rounded-box border border-line bg-base-200 p-4">
							<p dir={r.dir} class="font-content text-[17px] leading-[1.65]">{r.passage}</p>
						</div>
					{/if}

					{#if r.interaction === 'choice'}
						<ChoiceInteraction item={comoChoice(r)} bind:value={resposta[item.id].escolha} />
					{:else if r.interaction === 'type' && r.gradedLater}
						<WritingInteraction
							item={{
								dir: r.dir,
								instructions: r.prompt,
								maxLength: 600
							} satisfies WritingRuntimeItem}
							bind:value={resposta[item.id].texto}
							storageKey="entendo:previa:{item.id}"
						/>
					{:else if r.interaction === 'type' || r.interaction === 'cloze'}
						<ClozeInteraction item={comoCloze(r)} bind:value={resposta[item.id].texto} />
					{:else if r.interaction === 'assemble'}
						<AssembleInteraction item={comoAssemble(r)} bind:chosen={resposta[item.id].montagem} />
					{:else if r.interaction === 'select'}
						<SelectInteraction item={comoSelect(r)} bind:value={resposta[item.id].selecao} />
					{:else if r.interaction === 'match'}
						<MatchInteraction item={comoMatch(r)} bind:pairs={resposta[item.id].pares} />
					{:else if r.interaction === 'order'}
						<OrderInteraction item={comoOrder(r)} bind:order={resposta[item.id].ordem} />
					{:else if r.interaction === 'speak'}
						<SpeakInteraction item={comoSpeak(r)} bind:recording={resposta[item.id].gravando} />
					{/if}
				</section>
			{/if}
		{:else}
			<div
				class="rounded-box border-[1.5px] border-dashed border-line bg-base-100 p-[26px] text-center"
			>
				<p class="mb-1.5 font-display text-[17px] font-semibold">Nenhum item para pré-visualizar</p>
				<p class="text-[13px] leading-snug text-base-content/65">
					Volte para a revisão e gere os itens da atividade.
				</p>
			</div>
		{/each}
	</div>
</div>
