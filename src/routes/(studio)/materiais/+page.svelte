<script lang="ts">
	// Biblioteca. Apagar um material remove ele da biblioteca e dos rascunhos —
	// as versões PUBLICADAS guardam uma cópia congelada e continuam intactas
	// (regra inviolável 7, db.md "Versionamento imutável").
	//
	// O formulário é o MESMO da etapa 2 do wizard (`MaterialForm.svelte`), e
	// grava o mesmo `ContentUnit` (os dois passam por `montarMaterial`). Aqui
	// ele é um painel sobre a lista, que é onde o professor confere se o que
	// acabou de digitar já estava lá.
	import { tick } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import Loading from '$lib/components/Loading.svelte';
	import MaterialForm, { type Modo } from '$lib/components/MaterialForm.svelte';
	import MaterialList from '$lib/components/MaterialList.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { TIPOS, type MaterialKind, type MaterialRow } from '$lib/components/material-form';
	import { withMock } from '$lib/dev/with-mock';
	import {
		apagarMaterial,
		atualizarMaterial,
		criarMaterial,
		criarMateriaisEmLote
	} from './materiais.remote';

	interface PageData {
		materials: MaterialRow[];
		usedInCount: number;
		langFilters: string[];
	}

	const MOCK: PageData = {
		materials: [
			{
				id: 'mat_01',
				kind: 'pair',
				primary: 'She has been working here since 2019.',
				secondary: 'Ela trabalha aqui desde 2019.',
				language: 'Inglês',
				usedIn: 2,
				target: 'She has been working here since 2019.',
				source: 'Ela trabalha aqui desde 2019.',
				raw: '',
				note: '',
				example: '',
				questions: [],
				lines: []
			}
		],
		usedInCount: 1,
		langFilters: ['Inglês']
	};

	let { data: dataProp }: { data?: Partial<PageData> } = $props();
	const data = $derived(withMock(dataProp, MOCK));

	// Filtros são só de tela: a biblioteca inteira é do professor e já veio no
	// loader — uma ida ao servidor por clique de chip não compraria nada.
	let filtroKind = $state<MaterialKind | null>(null);
	let filtroLang = $state<string | null>(null);
	let busca = $state('');
	let pagina = $state(1);
	const POR_PAGINA = 12;

	const visiveis = $derived(
		data.materials.filter((m) => {
			if (filtroKind && m.kind !== filtroKind) return false;
			if (filtroLang && m.language !== filtroLang) return false;
			const termo = busca.trim().toLowerCase();
			if (!termo) return true;
			return m.primary.toLowerCase().includes(termo) || m.secondary.toLowerCase().includes(termo);
		})
	);

	// A biblioteca cresce sozinha: tudo que o professor cola dentro de uma
	// atividade entra aqui. Sem paginar, uma tabela de duzentas linhas.
	const naPagina = $derived(visiveis.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA));

	// Filtrar ou buscar volta para a primeira página — ficar na 3ª depois de o
	// resultado encolher para 4 linhas deixava a tabela vazia sem explicação.
	$effect(() => {
		void filtroKind;
		void filtroLang;
		void busca;
		pagina = 1;
	});

	// ── o painel ────────────────────────────────────────────────────────────
	let painel = $state(false);
	let formulario = $state<MaterialForm | null>(null);
	let modo = $state<Modo>('um');
	let editando = $state<MaterialRow | null>(null);
	let salvando = $state(false);
	let apagandoId = $state<string | null>(null);
	/** Confirmação antes de apagar: a consequência vai escrita, não num alert(). */
	let confirmando = $state<MaterialRow | null>(null);

	// O foco só pega depois de o painel deixar de ser `hidden`.
	async function abrirNovo() {
		painel = true;
		await tick();
		formulario?.novo();
	}
	function editar(m: MaterialRow) {
		painel = true;
		formulario?.editar(m);
	}
	function fechar() {
		painel = false;
		formulario?.limpar();
	}

	// Uma remote function por modo, e o painel fecha sozinho no sucesso: deixá-lo
	// aberto fazia o professor achar que não tinha salvo e clicar de novo. O lote
	// é a exceção — ele fica, mostrando quantas linhas entraram, porque colar a
	// lista seguinte é o gesto natural.
	const acao = $derived(
		editando ? atualizarMaterial : modo === 'lista' ? criarMateriaisEmLote : criarMaterial
	);
	const resultado = $derived(acao.result);
	const enviar = $derived(
		acao.enhance(async ({ submit }) => {
			const alvo = acao;
			salvando = true;
			try {
				await submit();
				if (!alvo.result?.ok) return;
				if (alvo === criarMateriaisEmLote) formulario?.limpar();
				else fechar();
				await invalidateAll();
			} finally {
				salvando = false;
			}
		})
	);

	async function apagar(m: MaterialRow) {
		apagandoId = m.id;
		try {
			await apagarMaterial({ contentId: m.id });
			confirmando = null;
			if (editando?.id === m.id) fechar();
			await invalidateAll();
		} finally {
			apagandoId = null;
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && painel) fechar();
	}

	const chip = 'rounded-full px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors';
	const chipOn = 'border-[1.5px] border-primary bg-primary text-primary-content';
	const chipOff = 'border-[1.5px] border-line bg-base-100 hover:border-primary';
</script>

<svelte:head><title>Materiais — entendo</title></svelte:head>
<svelte:window {onkeydown} />

<div class="px-4 py-5 lg:px-7 lg:py-[26px]">
	<div class="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
		<div class="min-w-[180px] flex-1">
			<h1 class="mb-1 font-display text-[22px] font-semibold tracking-[-0.024em] lg:text-[26px]">
				Materiais
			</h1>
			<p class="text-[13px] text-base-content/65">
				{data.materials.length}
				{data.materials.length === 1 ? 'material' : 'materiais'} · {data.usedInCount} em atividades
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<label
				class="flex min-h-[44px] min-w-[190px] items-center gap-2 rounded-field border border-line bg-base-200 px-3"
			>
				<svg
					class="size-4 shrink-0 text-base-content/50"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" />
					<path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
				<span class="sr-only">Buscar no conteúdo</span>
				<input
					bind:value={busca}
					type="search"
					placeholder="Buscar no conteúdo"
					class="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-base-content/50"
				/>
			</label>
			<button
				type="button"
				onclick={abrirNovo}
				class="btn min-h-[44px] motion-tap gap-2 btn-primary"
			>
				<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M12 5v14M5 12h14"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
					/>
				</svg>
				Novo material
			</button>
		</div>
	</div>

	<div class="mb-[18px] flex flex-wrap items-center gap-x-4 gap-y-2">
		<div class="flex flex-wrap gap-1.5">
			<button
				type="button"
				onclick={() => (filtroKind = null)}
				aria-pressed={filtroKind === null}
				class="{chip} {filtroKind === null ? chipOn : chipOff}">Todos</button
			>
			{#each TIPOS as t (t.id)}
				<button
					type="button"
					onclick={() => (filtroKind = filtroKind === t.id ? null : t.id)}
					aria-pressed={filtroKind === t.id}
					class="{chip} {filtroKind === t.id ? chipOn : chipOff}">{t.label}</button
				>
			{/each}
		</div>
		{#if data.langFilters.length > 0}
			<span class="hidden h-[22px] w-px bg-line sm:block"></span>
			<div class="flex flex-wrap gap-1.5">
				{#each data.langFilters as l (l)}
					<button
						type="button"
						onclick={() => (filtroLang = filtroLang === l ? null : l)}
						aria-pressed={filtroLang === l}
						class="{chip} {filtroLang === l ? chipOn : chipOff}">{l}</button
					>
				{/each}
			</div>
		{/if}
	</div>

	{#if data.materials.length === 0}
		<div
			class="rounded-box border-[1.5px] border-dashed border-line bg-base-200 p-[30px] text-center"
		>
			<p class="mb-1.5 font-display text-[20px] font-semibold">Nenhum material ainda</p>
			<p class="mx-auto max-w-[460px] text-[13.5px] leading-snug text-base-content/65">
				Tudo que você colar dentro de uma atividade entra aqui e pode ser reusado na próxima. Ou
				comece pela biblioteca, em "Novo material".
			</p>
		</div>
	{:else if visiveis.length === 0}
		<p class="rounded-box border border-line px-[18px] py-5 text-[13.5px] text-base-content/65">
			Nenhum material bate com esse filtro.
		</p>
	{:else}
		<MaterialList
			materiais={naPagina}
			contexto="biblioteca"
			editandoId={painel ? (editando?.id ?? null) : null}
			removendoId={apagandoId}
			onedit={editar}
			onremove={(m) => (confirmando = m)}
		/>
		<Pagination bind:pagina porPagina={POR_PAGINA} total={visiveis.length} rotulo="materiais" />
	{/if}

	{#if confirmando}
		<div
			class="mt-4 flex flex-wrap gap-3 rounded-box border border-s-[3px] border-line border-s-warning bg-base-200 px-[18px] py-4"
			role="alertdialog"
			aria-label="Confirmar exclusão"
		>
			<svg
				class="size-[19px] shrink-0 text-warning"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M12 3.5l9.5 16.5H2.5z"
					stroke="currentColor"
					stroke-width="2"
					stroke-linejoin="round"
				/>
				<path
					d="M12 9.5v4.5M12 17h.01"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
			<div class="min-w-[200px] flex-1">
				<p class="mb-1 text-sm font-semibold">
					{#if confirmando.usedIn > 0}
						Este material está em {confirmando.usedIn}
						{confirmando.usedIn === 1 ? 'atividade' : 'atividades'}
					{:else}
						Apagar este material?
					{/if}
				</p>
				<p class="text-[13px] leading-snug text-base-content/65">
					Apagar remove ele da sua biblioteca e dos rascunhos. As atividades que já estão no ar
					continuam intactas — elas guardam uma cópia congelada.
				</p>
			</div>
			<div class="flex items-center gap-2.5">
				<button
					type="button"
					onclick={() => (confirmando = null)}
					class="btn btn-sm motion-tap btn-neutral whitespace-nowrap">Cancelar</button
				>
				<button
					type="button"
					onclick={() => confirmando && apagar(confirmando)}
					disabled={apagandoId !== null}
					class="btn btn-sm motion-tap gap-2 btn-error whitespace-nowrap"
				>
					{#if apagandoId}
						<Loading variant="fila" size={11} tone="current" label="Apagando" />
						Apagando…
					{:else}
						Apagar mesmo assim
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- Painel sobre a lista: cadastrar não tira o professor de onde ele confere.
     O `<form>` fica montado mesmo fechado (`hidden`) para o `bind:this` do
     formulário existir antes do primeiro clique em "Novo material". -->
<div class="fixed inset-0 z-50 flex justify-end" hidden={!painel}>
	<button
		type="button"
		onclick={fechar}
		class="absolute inset-0 bg-base-content/40"
		aria-label="Fechar"
	></button>
	<aside
		class="relative flex h-full w-full max-w-[520px] animate-[en-slide-in_300ms_var(--ease-out-soft)_both] flex-col border-s border-line bg-base-100 shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.35)]"
		aria-label={editando ? 'Editar material' : 'Novo material'}
	>
		<form {...enviar} class="contents">
			{#if editando}<input type="hidden" name="contentId" value={editando.id} />{/if}
			<MaterialForm
				bind:this={formulario}
				bind:modo
				bind:editando
				contexto="biblioteca"
				conjunto={data.materials}
				{resultado}
				{salvando}
				onfechar={fechar}
			/>
		</form>
	</aside>
</div>
