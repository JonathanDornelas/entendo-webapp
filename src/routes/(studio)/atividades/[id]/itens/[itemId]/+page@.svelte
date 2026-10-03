<script lang="ts">
	// Editor de item — Nível 3 (kernel.md). O gabarito fica numa moldura âmbar
	// com cadeado porque ele nunca entra no payload do aluno (regra inviolável
	// 1); a prévia ao lado renderiza o resultado de toRuntime() — se o gabarito
	// aparecesse nela, estaria vazando de verdade. `+page@.svelte` reseta para o
	// layout raiz.
	//
	// O formulário ainda não é DERIVADO campo a campo do authoringSchema de
	// toda interação: `item.editavel` diz se este item tem gabarito em forma de
	// lista de textos (`type` e `cloze`). Nas outras, enunciado, prompt e modo
	// de correção são editáveis e o gabarito segue como o gerador montou — em
	// vez de a tela inteira virar decoração.
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { withMock } from '$lib/dev/with-mock';
	import AmbientShapes from '$lib/components/AmbientShapes.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import { salvarItem } from '../../../atividades.remote';
	import type { GradingMode, InteractionKind } from '$lib/kernel/interactions/types';

	type PromptKind = 'text' | 'audio' | 'image' | 'composite';
	interface PageData {
		activity: { id: string; dir: 'ltr' | 'rtl' };
		itemCount: number;
		suggestion?: string;
		prevId: string | null;
		nextId: string | null;
		normalizacao: { acentos: boolean; caixa: boolean; pontuacao: boolean };
		item: {
			index: number;
			id: string;
			editavel: boolean;
			prompt: string;
			promptKind: PromptKind;
			instructionKey: string;
			target: string;
			masked: string;
			answer: string;
			variants: string[];
			interaction: InteractionKind;
			gradingMode: GradingMode;
			grading: string;
			skill: string;
		};
	}

	const MOCK: PageData = {
		activity: { id: page.params.id ?? 'atv_01', dir: 'ltr' as const },
		itemCount: 24,
		suggestion: "she's been working",
		prevId: null,
		nextId: null,
		normalizacao: { acentos: false, caixa: true, pontuacao: true },
		item: {
			index: 4,
			id: page.params.itemId ?? 'itm_04',
			editavel: true,
			prompt: 'Complete a frase',
			promptKind: 'text' as PromptKind,
			instructionKey: 'fill-the-blank',
			target: 'She has been working here since 2019.',
			masked: 'She ___ ___ working here since 2019.',
			answer: 'has been',
			variants: ['has been', "she's been"],
			interaction: 'type' as InteractionKind,
			gradingMode: 'tolerant' as GradingMode,
			grading: 'tolerante',
			skill: 'Writing'
		}
	};

	let { data: dataProp }: { data?: Partial<PageData> } = $props();
	const data = $derived(withMock(dataProp, MOCK));

	const interactions: InteractionKind[] = [
		'type',
		'choice',
		'assemble',
		'cloze',
		'match',
		'order',
		'select',
		'speak'
	];
	const gradings: { mode: GradingMode; label: string }[] = [
		{ mode: 'exact', label: 'exata' },
		{ mode: 'tolerant', label: 'tolerante' },
		{ mode: 'sequence', label: 'sequência' },
		{ mode: 'set', label: 'conjunto' },
		{ mode: 'asr', label: 'ASR' },
		{ mode: 'rubric', label: 'rubrica' }
	];
	const promptKinds: { id: PromptKind; label: string }[] = [
		{ id: 'text', label: 'Texto' },
		{ id: 'audio', label: 'Áudio' },
		{ id: 'image', label: 'Imagem' },
		{ id: 'composite', label: 'Composto' }
	];

	// Os campos nascem do dado real (não do mock) para o SSR já sair certo, e
	// são reiniciados quando o item muda: "Próximo item" é a MESMA rota, então
	// sem isso o formulário do item anterior sobrevive à navegação — o mesmo
	// bug que o Player já teve com as questões.
	// `untrack`: a leitura inicial é deliberadamente NÃO reativa — quem
	// reaproveita o dado quando o item muda é o efeito abaixo, e sem isto o
	// Svelte avisa que só o primeiro valor seria capturado.
	const inicial = untrack(() => data.item);
	let interaction = $state<InteractionKind>(inicial.interaction);
	let gradingMode = $state<GradingMode>(inicial.gradingMode);
	let instruction = $state(inicial.prompt);
	let promptKind = $state<PromptKind>(inicial.promptKind);
	let target = $state(inicial.target);
	let masked = $state(inicial.masked);
	let answer = $state(inicial.answer);
	let variants = $state<string[]>([...inicial.variants]);
	let novaVariante = $state('');
	let sugestaoIgnorada = $state(false);

	/**
	 * As interações cujo gabarito este formulário sabe MONTAR — as mesmas que o
	 * loader marca como `editavel`.
	 *
	 * Os outros seis chips ficavam clicáveis e a troca falhava sempre no
	 * servidor, com "os campos deste tipo não estão completos": o payload
	 * enviado continuava sendo `{ accepted }`, que é a forma de `type`, e
	 * nenhum outro `authoringSchema` aceita isso. Desabilitar é dizer a
	 * verdade — trocar a interação depende do formulário derivado do
	 * `authoringSchema`, que continua pendente (kernel.md "Nível 3").
	 */
	const MONTAVEIS: InteractionKind[] = ['type', 'cloze'];
	const podeVirar = (i: InteractionKind) =>
		data.item.editavel ? MONTAVEIS.includes(i) : i === data.item.interaction;

	/** O que ainda falta para o item poder ser salvo — em texto, não em silêncio. */
	const impedimento = $derived.by(() => {
		if (!data.item.editavel) return '';
		if (answer.trim().length === 0) return 'Preencha a resposta esperada.';
		if (interaction === 'cloze') {
			if (masked.trim().length === 0) return 'Escreva a frase com a lacuna.';
			// `clozeAuthoringSchema` exige a máscara, e um payload que não valida
			// só rebentaria em `toRuntime()` — ou seja, na tela do aluno.
			if (!/_{2,}/.test(masked)) return 'Marque a lacuna na frase com ___ (três sublinhados).';
		}
		return '';
	});

	/** Em qual item o último "Item salvo" aconteceu — ver o efeito abaixo. */
	let salvoEm = $state<string | null>(null);

	let itemCarregado = inicial.id;
	$effect(() => {
		const item = data.item;
		if (item.id === itemCarregado) return;
		itemCarregado = item.id;
		salvoEm = null;
		interaction = item.interaction;
		gradingMode = item.gradingMode;
		instruction = item.prompt;
		promptKind = item.promptKind;
		target = item.target;
		masked = item.masked;
		answer = item.answer;
		variants = [...item.variants];
		novaVariante = '';
		sugestaoIgnorada = false;
	});

	// O gabarito no formato que o authoringSchema da interação espera. Só as
	// interações de texto entram aqui; nas outras o campo não é enviado e o
	// servidor mantém o payload atual.
	const payload = $derived.by(() => {
		if (!data.item.editavel) return '';
		const aceitas = [answer, ...variants].map((v) => v.trim()).filter(Boolean);
		const unicas = [...new Set(aceitas)];
		return JSON.stringify(
			interaction === 'cloze' ? { masked, accepted: unicas } : { accepted: unicas }
		);
	});

	const gradingLabel = $derived(
		gradings.find((g) => g.mode === gradingMode)?.label ?? data.item.grading
	);
	const podeSalvar = $derived(impedimento === '');

	function trocarInteracao(i: InteractionKind) {
		if (!podeVirar(i)) return;
		interaction = i;
		// `cloze` é `type` com a frase mascarada: vindo de `type` a máscara está
		// vazia, e sem esta semente o professor via um campo em branco sem saber
		// o que ele espera.
		if (i === 'cloze' && masked.trim().length === 0) {
			masked = target.trim() ? target.replace(answer.trim() || target, '___') : '';
			if (!/_{2,}/.test(masked)) masked = target ? `${target} ___` : '___';
		}
		// A correção acompanha: gabarito em lista de textos é sempre tolerante ou
		// exata, e `sequence`/`set`/`asr` não sabem ler esse payload.
		if (gradingMode !== 'exact' && gradingMode !== 'tolerant' && gradingMode !== 'rubric') {
			gradingMode = 'tolerant';
		}
	}

	function adicionarVariante() {
		const v = novaVariante.trim();
		if (!v || variants.includes(v)) return;
		variants = [...variants, v];
		novaVariante = '';
	}

	function href(itemId: string) {
		return resolve('/(studio)/atividades/[id]/itens/[itemId]', {
			id: data.activity.id,
			itemId
		});
	}

	// Salvar vai ao servidor (valida o payload contra o `authoringSchema`), e o
	// resultado aparece na barra do topo. Sem este estado o botão ficava parado
	// e o professor clicava duas vezes achando que não tinha pegado.
	let salvando = $state(false);
	const salvar = $derived(
		salvarItem.enhance(async ({ submit }) => {
			salvando = true;
			try {
				await submit();
				if (salvarItem.result?.ok) salvoEm = data.item.id;
			} finally {
				salvando = false;
			}
		})
	);

	const flags = $derived([
		{ label: 'Ignorar acentos', on: data.normalizacao.acentos },
		{ label: 'Ignorar caixa', on: data.normalizacao.caixa },
		{ label: 'Ignorar pontuação', on: data.normalizacao.pontuacao }
	]);
</script>

<svelte:head><title>Item {data.item.index} — entendo</title></svelte:head>

<div class="min-h-screen bg-base-200 py-8">
	<div class="mx-auto max-w-[1180px] overflow-hidden rounded-box border border-line bg-base-100">
		<div
			class="flex flex-wrap items-center gap-3.5 border-b border-line bg-base-200 px-[26px] py-3.5"
		>
			<a
				href={resolve('/(studio)/atividades/[id]/revisar', { id: data.activity.id })}
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
				Revisar itens
			</a>
			<span class="font-display text-[17px] font-semibold"
				>Item {data.item.index} de {data.itemCount}</span
			>
			<span
				class="rounded-full border border-line px-2.5 py-1 text-xs font-bold whitespace-nowrap text-base-content/65"
			>
				rascunho
			</span>
			<div class="flex-1"></div>
			{#if salvarItem.result?.ok && salvoEm === data.item.id}
				<span class="text-[12.5px] font-semibold text-success">Item salvo</span>
			{:else if salvarItem.result && !salvarItem.result.ok}
				<span class="text-[12.5px] font-semibold text-error">{salvarItem.result.error}</span>
			{/if}
			<!-- Ponta da lista mantém o botão visível e desabilitado: escondê-lo
			     faria a barra mudar de largura de um item para o outro. -->
			{#if data.prevId}
				<a
					href={href(data.prevId)}
					class="btn btn-sm motion-tap btn-neutral font-semibold no-underline">Item anterior</a
				>
			{:else}
				<span class="btn-disabled btn btn-sm btn-neutral font-semibold">Item anterior</span>
			{/if}
			{#if data.nextId}
				<a href={href(data.nextId)} class="btn btn-sm motion-tap btn-primary font-bold no-underline"
					>Próximo item</a
				>
			{:else}
				<span class="btn-disabled btn btn-sm btn-primary font-bold">Próximo item</span>
			{/if}
		</div>

		<div class="grid lg:grid-cols-[minmax(0,1fr)_420px]">
			<form {...salvar} class="min-w-0 p-8">
				<input type="hidden" name="activityId" value={data.activity.id} />
				<input type="hidden" name="itemId" value={data.item.id} />
				<input type="hidden" name="interaction" value={interaction} />
				<input type="hidden" name="gradingMode" value={gradingMode} />
				<input type="hidden" name="instructionKey" value={data.item.instructionKey} />
				{#if data.item.editavel}
					<input type="hidden" name="payload" value={payload} />
				{/if}

				<div class="mb-4">
					<span class="mb-1.5 block text-[13px] font-semibold">Interação</span>
					<div class="flex flex-wrap gap-1.5">
						{#each interactions as i (i)}
							<button
								type="button"
								onclick={() => trocarInteracao(i)}
								disabled={!podeVirar(i)}
								title={podeVirar(i)
									? undefined
									: 'Trocar para esta interação depende do formulário derivado do schema de autoria dela, que ainda não existe.'}
								class="rounded-full px-3.5 py-[7px] text-[13px] transition-[border-color,transform] duration-150 enabled:hover:-translate-y-0.5 disabled:opacity-45
								       {interaction === i
									? 'border-[1.5px] border-primary bg-base-300 font-bold text-primary'
									: 'border border-line bg-base-200 font-semibold text-base-content/65'}"
							>
								{i}
							</button>
						{/each}
					</div>
					<span class="mt-2 block text-[12.5px] text-base-content/65">
						{#if data.item.editavel}
							Dá para alternar entre <strong class="font-semibold">type</strong> e
							<strong class="font-semibold">cloze</strong>: as duas guardam o gabarito como lista de
							textos, que é o que este formulário sabe montar. As outras precisam do formulário
							derivado do schema de autoria delas, ainda não construído.
						{:else}
							O gabarito de <strong class="font-semibold">{data.item.interaction}</strong> ainda não tem
							formulário próprio. Enunciado, prompt e correção são editáveis; o gabarito segue como foi
							gerado.
						{/if}
					</span>
				</div>

				<div class="mb-[22px] grid gap-3.5">
					<label class="block">
						<span class="mb-1.5 block text-[13px] font-semibold">Enunciado</span>
						<input
							name="instruction"
							bind:value={instruction}
							class="input h-auto w-full py-2.5 text-[14.5px]"
						/>
					</label>
					<div class="grid gap-3 sm:grid-cols-[1fr_160px]">
						<label class="block">
							<span class="mb-1.5 block text-[13px] font-semibold">Frase alvo</span>
							<input
								name="promptText"
								bind:value={target}
								dir={data.activity.dir}
								class="input h-auto w-full py-2.5 font-content text-[15px]"
							/>
						</label>
						<label class="block">
							<span class="mb-1.5 block text-[13px] font-semibold">Prompt</span>
							<select
								name="promptKind"
								bind:value={promptKind}
								class="select h-auto w-full py-2.5 text-[14.5px]"
							>
								{#each promptKinds as p (p.id)}
									<option value={p.id}>{p.label}</option>
								{/each}
							</select>
						</label>
					</div>
					{#if promptKind === 'audio'}
						<p class="text-[12.5px] leading-snug text-base-content/65">
							Em prompt de áudio a frase alvo é o que o TTS sintetiza — ou seja, é gabarito. Ela
							nunca vai para a tela do aluno; ele só ouve.
						</p>
					{/if}
				</div>

				<!-- Gabarito: moldura âmbar + cadeado. Fica só no servidor — regra inviolável 1. -->
				<fieldset class="mb-[22px] overflow-hidden rounded-box border-[1.5px] border-warning p-0">
					<legend class="sr-only">Gabarito</legend>
					<div
						class="flex items-center gap-2.5 border-b border-warning/30 bg-warning/12 px-4 py-[11px]"
					>
						<svg
							class="size-[17px] shrink-0 text-warning"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
						>
							<rect
								x="4"
								y="10.5"
								width="16"
								height="10"
								rx="2.5"
								stroke="currentColor"
								stroke-width="2"
							/>
							<path
								d="M8 10.5V7.5a4 4 0 118 0v3"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
						<span class="text-[13px] font-bold text-warning">Gabarito — fica só no servidor</span>
						<div class="flex-1"></div>
						<span class="text-xs text-base-content/65">Nunca entra no payload do aluno</span>
					</div>
					<div class="bg-warning/5 p-[18px]">
						{#if interaction === 'cloze'}
							<label class="mb-3.5 block">
								<span class="mb-1.5 block text-[13px] font-semibold">Frase com a lacuna</span>
								<input
									bind:value={masked}
									dir={data.activity.dir}
									placeholder="She ___ ___ working here since 2019."
									class="w-full rounded-field border border-warning/40 bg-base-100 px-3.5 py-2.5 font-content text-[15px]"
								/>
								<span class="mt-1.5 block text-[12px] text-base-content/65">
									Marque a lacuna com <span class="font-mono">___</span>. A lacuna aparece para o
									aluno com a LARGURA da resposta — o comprimento vaza de propósito, as letras
									nunca.
								</span>
							</label>
						{/if}
						<label class="mb-3.5 block">
							<span class="mb-1.5 block text-[13px] font-semibold">Resposta esperada</span>
							<input
								bind:value={answer}
								readonly={!data.item.editavel}
								dir={data.activity.dir}
								class="w-full rounded-field border border-warning/40 bg-base-100 px-3.5 py-2.5 font-content text-[15px] read-only:text-base-content/65"
							/>
						</label>
						<p class="mb-2 text-[13px] font-semibold">Variantes também aceitas</p>
						<div class="mb-3 flex flex-wrap gap-1.5">
							{#each variants as v (v)}
								<span
									class="flex items-center gap-1.5 rounded-full border border-line bg-base-100 py-1.5 ps-3 pe-2 font-content text-[13.5px]"
									dir={data.activity.dir}
								>
									{v}
									{#if data.item.editavel}
										<button
											type="button"
											onclick={() => (variants = variants.filter((x) => x !== v))}
											class="grid size-[18px] place-items-center text-base-content/65 hover:text-error"
											aria-label="Remover variante {v}"
										>
											<svg class="size-[11px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
												<path
													d="M6 6l12 12M18 6L6 18"
													stroke="currentColor"
													stroke-width="3"
													stroke-linecap="round"
												/>
											</svg>
										</button>
									{/if}
								</span>
							{/each}
							{#if variants.length === 0}
								<span class="text-[12.5px] text-base-content/65">Nenhuma além da principal.</span>
							{/if}
						</div>
						{#if data.item.editavel}
							<div class="mb-3 flex gap-2">
								<input
									bind:value={novaVariante}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											adicionarVariante();
										}
									}}
									dir={data.activity.dir}
									placeholder="Outra resposta aceita"
									class="min-w-0 flex-1 rounded-field border border-warning/40 bg-base-100 px-3.5 py-2 font-content text-[14px]"
								/>
								<button
									type="button"
									onclick={adicionarVariante}
									disabled={novaVariante.trim().length === 0}
									class="btn btn-sm motion-tap btn-neutral font-semibold">Adicionar</button
								>
							</div>
						{/if}
						{#if data.suggestion && !sugestaoIgnorada && !variants.includes(data.suggestion)}
							<div
								class="flex items-center gap-2.5 rounded-field border border-dashed border-warning/45 bg-base-100 px-3 py-2.5"
							>
								<svg
									class="size-4 shrink-0 text-warning"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M13 4l-8 9h6l-2 7 8-9h-6z"
										stroke="currentColor"
										stroke-width="2"
										stroke-linejoin="round"
									/>
								</svg>
								<span class="flex-1 text-[13px] leading-snug">
									Sugestão: aceitar também <span class="font-content font-semibold"
										>{data.suggestion}</span
									>
								</span>
								<button
									type="button"
									onclick={() => (variants = [...variants, data.suggestion!])}
									disabled={!data.item.editavel}
									class="px-2 py-1.5 text-[12.5px] font-bold text-primary disabled:opacity-45"
								>
									Aceitar
								</button>
								<button
									type="button"
									onclick={() => (sugestaoIgnorada = true)}
									class="px-2 py-1.5 text-[12.5px] font-semibold text-base-content/65"
									>Ignorar</button
								>
							</div>
						{/if}
					</div>
				</fieldset>

				<p class="mb-2.5 text-[13px] font-semibold">Como corrigir</p>
				<div class="mb-3.5 flex flex-wrap gap-1.5">
					{#each gradings as g (g.mode)}
						<button
							type="button"
							onclick={() => (gradingMode = g.mode)}
							class="rounded-full px-3.5 py-[7px] text-[13px] transition-transform duration-150 hover:-translate-y-0.5
							       {gradingMode === g.mode
								? 'border-[1.5px] border-primary bg-base-300 font-bold text-primary'
								: 'border border-line bg-base-200 font-semibold text-base-content/65'}"
						>
							{g.label}
						</button>
					{/each}
				</div>
				<!-- Normalização é do LanguageProfile, não do item: mostrar aqui um
				     interruptor por exercício seria uma regra de língua fora do perfil
				     (CLAUDE.md). Estes são o que o par de idiomas já decide. -->
				<div class="flex flex-wrap gap-2.5">
					{#each flags as f (f.label)}
						<span
							class="flex items-center gap-2 rounded-full border border-line bg-base-200 px-3 py-[7px]
							       text-[12.5px] font-semibold {f.on ? '' : 'text-base-content/65'}"
						>
							{f.label}
							<input
								type="checkbox"
								checked={f.on}
								disabled
								class="toggle toggle-xs toggle-primary"
							/>
						</span>
					{/each}
				</div>
				<p class="mt-2 text-[12.5px] text-base-content/65">
					Vêm do idioma da atividade, não deste exercício.
				</p>

				<div class="mt-6 flex flex-wrap items-center gap-3">
					{#if impedimento}
						<!-- Botão cinza sem motivo é o que fazia o professor clicar de novo
						     achando que a tela travou. -->
						<p
							class="flex w-full items-center gap-2 rounded-field border-s-[3px] border-warning bg-base-200 px-3 py-2.5 text-[13px]"
							role="status"
						>
							<svg
								class="size-4 shrink-0 text-warning"
								viewBox="0 0 24 24"
								fill="none"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
								<path
									d="M12 7.5v5.5M12 16.5h.01"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
								/>
							</svg>
							{impedimento}
						</p>
					{/if}
					<button
						type="submit"
						disabled={!podeSalvar || salvando}
						class="btn h-[46px] motion-tap gap-2.5 btn-primary font-bold"
					>
						{#if salvando}
							<Loading variant="fila" size={12} tone="current" label="Salvando" />
							Salvando…
						{:else}
							Salvar item
						{/if}
					</button>
					<a
						href={resolve('/(studio)/atividades/[id]/revisar', { id: data.activity.id })}
						class="btn h-[46px] motion-tap btn-neutral font-semibold no-underline">Voltar</a
					>
				</div>
			</form>

			<!-- As formas vivem no PAINEL, não dentro do celular: dentro dele elas
			     ficavam atrás do enunciado e do campo de resposta, que é justamente
			     o que design-system.md proíbe. Aqui elas ocupam o vazio embaixo do
			     aparelho — só a faixa de baixo, porque em cima está o rótulo. -->
			<aside class="relative overflow-hidden border-s border-line bg-base-200 p-[26px] px-6">
				<AmbientShapes height="190px" edges="bottom" scale={0.62} />

				<div class="relative z-1 mb-1.5 flex items-center gap-2.5">
					<span class="text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase"
						>Prévia do aluno</span
					>
					<span class="rounded-full bg-success/12 px-2 py-1 font-mono text-[11px] text-success"
						>toRuntime()</span
					>
				</div>
				<p class="relative z-1 mb-4 text-[12.5px] leading-snug text-base-content/65">
					Esta prévia usa o mesmo payload que vai para o browser do aluno. Se o gabarito aparecesse
					aqui, ele estaria vazando de verdade.
				</p>

				<!-- Um celular de verdade, centrado na coluna: `max-w-[340px]` com
				     `min-h-[560px]`, como no protótipo. Altura MÍNIMA e não proporção
				     fixa — a moldura acompanha o conteúdo quando a questão é longa em
				     vez de cortá-la, e uma questão curta ainda mostra o respiro que o
				     aluno vê. -->
				<div
					class="relative z-1 mx-auto flex min-h-[560px] w-full max-w-[340px] flex-col overflow-hidden
					       rounded-[30px] border-8 border-bezel bg-base-100"
				>
					<div class="flex shrink-0 items-center gap-2.5 px-[15px] pt-3.5 pb-2.5">
						<span class="size-7 shrink-0 rounded-full bg-base-200"></span>
						<div class="h-2 flex-1 overflow-hidden rounded-full bg-base-300">
							<div
								class="h-full origin-left animate-[en-grow-x_1s_var(--ease-out-soft)_both] bg-primary"
								style="width: {(data.item.index / data.itemCount) * 100}%"
							></div>
						</div>
						<span class="font-mono text-[11px] text-base-content/60"
							>{data.item.index}/{data.itemCount}</span
						>
					</div>
					<div class="flex flex-1 flex-col px-[17px] pt-3.5 pb-5">
						<p class="mb-2.5 text-[10.5px] font-bold tracking-[0.08em] text-primary uppercase">
							{data.item.skill} · {gradingLabel}
						</p>
						<p class="mb-3.5 font-display text-xl leading-tight font-semibold tracking-[-0.02em]">
							{instruction}
						</p>
						<!-- Prompt de áudio não mostra a frase: ela É o gabarito. Interação
						     sem lacuna (montar, escolher, ordenar) não tem `masked`, aí a
						     prévia mostra o texto que o aluno realmente lê. -->
						{#if promptKind === 'audio'}
							<p
								class="mb-3.5 flex items-center gap-2 rounded-field bg-accent/10 px-3.5 py-3 text-[13px] font-semibold text-accent"
							>
								<svg
									class="size-[18px] shrink-0"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4zM16.5 9a4.5 4.5 0 010 6"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								Áudio — o aluno só ouve
							</p>
						{:else}
							<p class="mb-3.5 font-content text-base leading-relaxed" dir={data.activity.dir}>
								{(interaction === 'cloze' ? masked : '') || target}
							</p>
						{/if}
						<!-- A prévia mostra a FORMA da resposta da interação escolhida.
						     Fixa em "Digite sua resposta", ela mentia em seis dos oito
						     tipos — o professor trocava para "escolher" e via um campo de
						     texto. Nenhum conteúdo de gabarito entra aqui: são as caixas
						     vazias, não as alternativas. -->
						{#if interaction === 'choice' || interaction === 'select'}
							<div class="grid gap-2">
								{#each [1, 2, 3] as n (n)}
									<span
										class="flex items-center gap-2 rounded-field border-[1.5px] border-line px-3 py-2.5 text-[13px] text-base-content/50"
									>
										<span
											class="grid size-5 place-items-center rounded-full bg-base-200 font-mono text-[10px]"
										>
											{n}
										</span>
										Alternativa {n}
									</span>
								{/each}
							</div>
						{:else if interaction === 'assemble' || interaction === 'order'}
							<div class="flex flex-wrap gap-1.5">
								{#each [44, 62, 38, 54, 46] as largura (largura)}
									<span
										class="rounded-field border-[1.5px] border-line px-3 py-2"
										style="width: {largura}px"
									></span>
								{/each}
							</div>
						{:else if interaction === 'match'}
							<div class="grid grid-cols-2 gap-2">
								{#each [1, 2, 3, 4] as n (n)}
									<span class="rounded-field border-[1.5px] border-line px-3 py-2.5"></span>
								{/each}
							</div>
						{:else if interaction === 'speak'}
							<span
								class="mx-auto grid size-16 place-items-center rounded-full bg-accent/12 text-accent"
							>
								<svg class="size-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<path
										d="M9 5.5a3 3 0 016 0v6a3 3 0 01-6 0zM5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
								</svg>
							</span>
						{:else}
							<p
								class="rounded-field border-[1.5px] border-line bg-base-100 px-3.5 py-3 font-content text-[15px] text-base-content/60"
							>
								Digite sua resposta
							</p>
						{/if}
						<!-- Empurra a ação para o rodapé, como no Player: lá ela é fixa
						     embaixo, e sem isto a prévia mostrava tudo grudado no topo. -->
						<div class="min-h-3.5 flex-1"></div>
						<p
							class="rounded-field bg-primary py-3 text-center text-[15px] font-bold text-primary-content"
						>
							{gradingMode === 'rubric' ? 'Enviar' : 'Verificar'}
						</p>
					</div>
				</div>

				<p class="relative z-1 mt-3.5 flex items-center gap-2 text-xs text-base-content/65">
					<svg
						class="size-[15px] shrink-0 text-success"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M4 12.5l5 5L20 6.5"
							stroke="currentColor"
							stroke-width="2.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					Nenhum campo de gabarito neste payload
				</p>
			</aside>
		</div>
	</div>
</div>
