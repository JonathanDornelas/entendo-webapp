<script lang="ts">
	// Os módulos do professor (desenho "Studio Modulos v2",
	// docs/telas-modulos-professor.md 1). A lista responde três perguntas sem
	// abrir nada: o que precisa de mim (o aviso do topo, o único vermelho), o que
	// sai esta semana (os 7 dias de TODOS os módulos) e como cada módulo anda em
	// cada turma (ritmo, enviadas, próximo envio, quantos terminaram a última).
	//
	// Criar é um formulário curto AQUI (nome e cor); atividades e turmas entram
	// no módulo aberto. Renomear, duplicar e apagar ficam no "⋯" do cartão, e
	// apagar sempre diz a consequência antes de perguntar.
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import AmbientShapes from '$lib/components/AmbientShapes.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import SemanaDeEnvios from '$lib/components/SemanaDeEnvios.svelte';
	import {
		CLASSE_DA_ETIQUETA,
		CORES_DE_ETIQUETA,
		etiquetaDaTurma,
		NOME_DA_COR,
		type CorDeEtiqueta
	} from '$lib/etiquetas';
	import { apagarModulo, criarModulo, duplicarModulo, editarModulo } from './modulos.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	type Modulo = (typeof data.modulos)[number];
	type Estado = Modulo['estado'];

	const ICONE = {
		erro: 'M12 7.5v6M12 16.5h.01M12 3l9.5 17H2.5z',
		pausa: 'M9 6v12M15 6v12',
		ok: 'M5 12.5l4.5 4.5L19 7',
		play: 'M7 5v14l11-7z',
		relogio: 'M12 7.5V12l3 2M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17z',
		traco: 'M6 12h12'
	};

	// Vermelho só no envio que não saiu; "tudo enviado" é neutro, não verde.
	const PILULA: Record<Estado, { texto: string; icone: string; classe: string }> = {
		ativo: { texto: 'Envio programado', icone: ICONE.play, classe: 'bg-base-300 text-primary' },
		erro: { texto: 'Envio que não saiu', icone: ICONE.erro, classe: 'bg-error text-error-content' },
		pausa: {
			texto: 'Pausado',
			icone: ICONE.pausa,
			classe: 'border border-line bg-base-200 text-base-content/70'
		},
		fim: {
			texto: 'Tudo enviado',
			icone: ICONE.ok,
			classe: 'border border-line bg-base-200 text-base-content/70'
		},
		parado: {
			texto: 'Sem programação',
			icone: ICONE.traco,
			classe: 'border-[1.5px] border-dashed border-line text-base-content/70'
		},
		sem: {
			texto: 'Sem turma',
			icone: ICONE.traco,
			classe: 'border-[1.5px] border-dashed border-line text-base-content/70'
		}
	};

	const PROXIMO: Record<Modulo['turmas'][number]['tipo'], { classe: string; icone: string }> = {
		erro: { classe: 'font-bold text-error', icone: ICONE.erro },
		aviso: { classe: 'font-semibold text-base-content', icone: ICONE.erro },
		ok: { classe: 'font-semibold text-base-content', icone: ICONE.relogio },
		pausa: { classe: 'text-base-content/65', icone: ICONE.pausa },
		fim: { classe: 'text-base-content/65', icone: ICONE.ok },
		nada: { classe: 'text-base-content/65', icone: ICONE.traco }
	};

	const VAZIO_DA_SEMANA: Record<Estado, (m: Modulo) => string> = {
		pausa: (m) =>
			`Pausado${m.pausadaDesde ? ` desde ${m.pausadaDesde}` : ''}. Nada sai até você retomar.`,
		fim: () => 'Tudo já foi enviado.',
		sem: () => 'Sem turma, nada programado.',
		parado: () => 'Nenhuma turma com programação ainda.',
		ativo: () => 'Nada sai nesta semana.',
		erro: () => 'Nada sai nesta semana.'
	};

	// ── filtros: de tela, sobre a lista que o loader já mandou ──
	const FILTROS: { id: string; rotulo: string; casa: (m: Modulo) => boolean }[] = [
		{ id: 'todos', rotulo: 'Todos', casa: () => true },
		{
			id: 'ativo',
			rotulo: 'Programados',
			casa: (m) => m.estado === 'ativo' || m.estado === 'erro'
		},
		{ id: 'erro', rotulo: 'Com problema', casa: (m) => m.estado === 'erro' },
		{ id: 'pausa', rotulo: 'Pausados', casa: (m) => m.estado === 'pausa' },
		{ id: 'sem', rotulo: 'Sem turma', casa: (m) => m.estado === 'sem' },
		{ id: 'fim', rotulo: 'Concluídos', casa: (m) => m.estado === 'fim' }
	];
	let filtro = $state('todos');
	let busca = $state('');

	/** Busca de TELA: sem caixa e sem acento, para "intermediario" achar "Intermediário". */
	const simples = (t: string) =>
		t.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
	const visiveis = $derived.by(() => {
		const f = FILTROS.find((x) => x.id === filtro) ?? FILTROS[0];
		const q = simples(busca.trim());
		return data.modulos.filter(
			(m) =>
				f.casa(m) &&
				(!q ||
					simples(m.name).includes(q) ||
					m.turmas.some((t) => simples(t.nome).includes(q) || simples(t.sigla).includes(q)))
		);
	});

	// ── criar ──
	let criando = $state(false);
	let nome = $state('');
	let cor = $state<CorDeEtiqueta>('violeta');
	let salvando = $state(false);
	let erroCriar = $state<string | null>(null);
	let campoNome = $state<HTMLInputElement | null>(null);
	const sigla = $derived(nome.trim() ? etiquetaDaTurma(nome) : 'NM');

	async function abrirCriacao() {
		criando = true;
		await tick();
		campoNome?.focus();
	}
	// O "Novo módulo" do início chega com `?novo=1`: o formulário já abre.
	onMount(() => {
		if (page.url.searchParams.get('novo') === '1') void abrirCriacao();
	});
	async function criar(e: SubmitEvent) {
		e.preventDefault();
		if (!nome.trim()) return;
		salvando = true;
		erroCriar = null;
		try {
			const r = await criarModulo({ name: nome, color: cor, activityIds: [] });
			await goto(resolve('/(studio)/modulos/[id]', { id: r.id }));
		} catch {
			erroCriar = 'Não deu para criar agora. Tente de novo em instantes.';
		} finally {
			salvando = false;
		}
	}

	// ── o "⋯" de cada cartão ──
	let menu = $state<string | null>(null);
	let pendente = $state<string | null>(null);
	let erroCartao = $state<{ id: string; texto: string } | null>(null);
	let renomeando = $state<string | null>(null);
	let novoNome = $state('');
	let apagando = $state<string | null>(null);

	function aoClicarFora(e: MouseEvent) {
		if (menu && !(e.target instanceof Element && e.target.closest('[data-menu]'))) menu = null;
	}
	function aoTeclar(e: KeyboardEvent) {
		if (e.key === 'Escape' && menu) {
			const id = menu;
			menu = null;
			document.getElementById(`menu-botao-${id}`)?.focus();
		}
	}
	/** Setas andam entre os itens do menu aberto, como num menu do sistema. */
	function navegarNoMenu(e: KeyboardEvent) {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
		e.preventDefault();
		const itens = [
			...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="menuitem"]')
		];
		const i = itens.indexOf(document.activeElement as HTMLElement);
		const j = (i + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
		itens[j]?.focus();
	}
	function focarPrimeiro(no: HTMLElement) {
		no.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
	}

	async function rodar(id: string, qual: string, fn: () => Promise<void>) {
		pendente = `${qual}:${id}`;
		erroCartao = null;
		try {
			await fn();
		} catch {
			erroCartao = { id, texto: 'Não deu para concluir agora. Tente de novo em instantes.' };
		} finally {
			pendente = null;
		}
	}
	async function iniciarRenomear(m: Modulo) {
		menu = null;
		apagando = null;
		renomeando = m.id;
		novoNome = m.name;
		await tick();
		document.getElementById(`renomear-${m.id}`)?.focus();
	}
	const renomear = (m: Modulo) =>
		rodar(m.id, 'renomear', async () => {
			await editarModulo({
				moduleId: m.id,
				name: novoNome,
				description: m.description ?? '',
				color: m.color
			});
			renomeando = null;
			await invalidateAll();
		});
	const duplicar = (m: Modulo) =>
		rodar(m.id, 'duplicar', async () => {
			menu = null;
			const r = await duplicarModulo({ moduleId: m.id });
			await goto(resolve('/(studio)/modulos/[id]', { id: r.id }));
		});
	const apagar = (m: Modulo) =>
		rodar(m.id, 'apagar', async () => {
			await apagarModulo({ moduleId: m.id });
			apagando = null;
			await invalidateAll();
		});

	const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

	const PASSOS = [
		{
			n: '1',
			t: 'Junte as atividades',
			d: 'Escolha as que já existem na sua conta e coloque na ordem em que a turma deve fazer.'
		},
		{
			n: '2',
			t: 'Escolha as turmas',
			d: 'O mesmo módulo pode ir para várias turmas, cada uma no próprio ritmo.'
		},
		{
			n: '3',
			t: 'Programe os envios',
			d: 'Toda quinta, a cada duas semanas ou em datas fixas. A prévia mostra cada data antes de salvar.'
		}
	];
</script>

<svelte:head><title>Módulos — entendo</title></svelte:head>
<svelte:window onclick={aoClicarFora} onkeydown={aoTeclar} />

{#snippet icone(d: string, classe = 'size-3')}
	<svg class="{classe} flex-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"
		><path
			{d}
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/></svg
	>
{/snippet}

{#snippet calendario()}
	<svg class="size-[15px] flex-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"
		><rect
			x="3.5"
			y="5"
			width="17"
			height="15"
			rx="3"
			stroke="currentColor"
			stroke-width="2"
		/><path
			d="M3.5 10h17M8 3v4M16 3v4"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/></svg
	>
{/snippet}

<div class="pagina-studio">
	<div>
		{#if data.modulos.length > 0}
			<div class="mb-5.5 flex flex-wrap items-end gap-x-4 gap-y-3">
				<div class="min-w-[200px] flex-1">
					<h1
						class="mb-1 font-display text-[22px] font-semibold tracking-[-0.024em] lg:text-[28px]"
					>
						Módulos
					</h1>
					<p class="text-[13.5px] text-base-content/65">
						{plural(data.resumo.modulos, 'módulo', 'módulos')} · {plural(
							data.resumo.atividades,
							'atividade',
							'atividades'
						)} · {plural(data.resumo.turmasRecebendo, 'turma recebendo', 'turmas recebendo')}
					</p>
				</div>
				{#if !criando}
					<button
						type="button"
						onclick={abrirCriacao}
						class="btn min-h-11 flex-[1_1_100%] motion-tap gap-2 btn-primary text-[14px] font-bold lg:flex-none"
					>
						{@render icone('M12 5v14M5 12h14', 'size-4')}
						Novo módulo
					</button>
				{/if}
			</div>
		{/if}

		{#if criando}
			<form
				onsubmit={criar}
				class="mb-5.5 animate-[en-fade-up_300ms_var(--ease-out-soft)_both] rounded-[15px] border border-primary/34 px-4 py-4 lg:px-5 lg:py-4.5"
			>
				<p class="mb-1 text-[14.5px] font-bold">Novo módulo</p>
				<p class="mb-3.5 text-[12.5px] text-base-content/65">
					As atividades e as turmas entram depois, no módulo aberto.
				</p>
				<div class="flex flex-wrap items-end gap-x-4.5 gap-y-3.5">
					<label class="grid min-w-[220px] flex-1 gap-1.75">
						<span class="text-[12.5px] font-bold">Nome</span>
						<input
							bind:this={campoNome}
							bind:value={nome}
							required
							maxlength="80"
							placeholder="Ex.: Unidade 4"
							class="input min-h-11.5 w-full text-[14.5px]"
						/>
					</label>
					<fieldset class="grid gap-1.75 border-0 p-0">
						<legend class="mb-1.75 text-[12.5px] font-bold">Cor da etiqueta</legend>
						<div class="flex gap-1.75">
							{#each CORES_DE_ETIQUETA as opcao (opcao)}
								<button
									type="button"
									onclick={() => (cor = opcao)}
									aria-pressed={cor === opcao}
									aria-label={NOME_DA_COR[opcao]}
									title={NOME_DA_COR[opcao]}
									class="grid size-11.5 place-items-center rounded-[11px] border-2 p-0 transition-colors {cor ===
									opcao
										? 'border-primary bg-base-200'
										: 'border-line bg-base-100'}"
								>
									<span
										class="grid size-8 place-items-center rounded-[8px] text-[11px] font-bold {CLASSE_DA_ETIQUETA[
											opcao
										]}">{sigla}</span
									>
								</button>
							{/each}
						</div>
					</fieldset>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => {
								criando = false;
								erroCriar = null;
							}}
							class="btn min-h-11.5 border border-line bg-transparent text-[13.5px] font-semibold text-base-content/70 hover:text-base-content"
							>Cancelar</button
						>
						<button
							type="submit"
							disabled={salvando || !nome.trim()}
							class="btn min-h-11.5 motion-tap gap-2 btn-primary text-[13.5px] font-bold"
						>
							{#if salvando}<Loading variant="fila" size={10} tone="current" label="Criando" />{/if}
							Criar módulo
						</button>
					</div>
				</div>
				{#if erroCriar}
					<p class="mt-2.5 text-[13px] font-semibold text-error" role="alert">{erroCriar}</p>
				{/if}
			</form>
		{/if}

		{#if data.modulos.length === 0}
			<!-- O vazio diz o ganho, diz que o módulo é opcional e mostra os três passos. -->
			<div
				class="relative mb-6 overflow-hidden rounded-[18px] border border-line bg-base-200 px-4.5 py-6 lg:p-10"
			>
				<AmbientShapes layout="corner" />
				<div class="relative max-w-[520px]">
					<p class="mb-2.5 text-[11px] font-bold tracking-[0.09em] text-primary uppercase">
						Módulos
					</p>
					<h1
						class="mb-3 font-display text-[23px] leading-[1.1] font-semibold tracking-[-0.026em] text-pretty lg:text-[30px]"
					>
						Junte atividades numa sequência e mande para a turma no ritmo que você escolher
					</h1>
					<p class="mb-5 text-[14px] leading-relaxed text-pretty text-base-content/65">
						Um módulo organiza a sua lista e programa os envios: toda quinta, uma por semana ou em
						datas fixas. Não é obrigatório. As atividades continuam funcionando sozinhas.
					</p>
					{#if !criando}
						<button
							type="button"
							onclick={abrirCriacao}
							class="btn min-h-11.5 w-full motion-tap gap-2 btn-primary text-[14px] font-bold lg:w-auto"
						>
							{@render icone('M12 5v14M5 12h14', 'size-4')}
							Criar o primeiro módulo
						</button>
					{/if}
				</div>
			</div>
			<ol class="grid list-none gap-2.5 p-0 lg:grid-cols-3 lg:gap-3">
				{#each PASSOS as p (p.n)}
					<li class="rounded-[14px] border border-line p-4.5">
						<span
							class="mb-3 grid size-7.5 place-items-center rounded-[9px] bg-base-300 font-mono text-[13px] text-primary"
							>{p.n}</span
						>
						<p class="mb-1.25 text-[14.5px] font-bold">{p.t}</p>
						<p class="text-[13px] leading-normal text-pretty text-base-content/65">{p.d}</p>
					</li>
				{/each}
			</ol>
		{:else}
			<!-- o que precisa de você: o único vermelho da tela -->
			{#if data.alerta}
				{@const a = data.alerta}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- as duas rotas passam por resolve(); a segunda leva a query que abre o painel. -->
				<a
					href={a.atividadeId
						? resolve('/(studio)/atividades/[id]', { id: a.atividadeId })
						: resolve('/(studio)/modulos/[id]', { id: a.moduloId }) + '?turma=' + a.alocacaoId}
					class="mb-6.5 flex motion-tap flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[13px] border border-error/32 bg-[color-mix(in_oklab,var(--color-error)_7%,var(--color-base-100))] px-4 py-3.25 text-base-content no-underline transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-error"
				>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
					<svg
						class="size-[19px] flex-none text-error"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
						><path
							d={ICONE.erro}
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/></svg
					>
					<span class="min-w-[220px] flex-1 text-[13.5px] leading-normal"
						><strong>{a.titulo}</strong> {a.detalhe}</span
					>
					<span class="flex-none text-[13px] font-bold whitespace-nowrap text-error">{a.acao}</span>
				</a>
			{/if}

			<!-- próximos 7 dias, de todos os módulos -->
			<section class="mb-7.5">
				<div class="mb-3 flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
					<h2 class="font-display text-[17px] font-semibold lg:text-[19px]">Próximos 7 dias</h2>
					<span class="text-[13px] text-base-content/65"
						>o que sai, de todos os módulos, até {data.semana.at(-1)?.rotulo}
						{data.semana.at(-1)?.data}</span
					>
					<span class="min-w-1 flex-1"></span>
					<a
						href={resolve('/(studio)/modulos/calendario')}
						class="flex items-center gap-1.75 px-0.5 py-1.5 text-[13px] font-bold text-primary no-underline"
					>
						{@render calendario()}
						Ver calendário
					</a>
				</div>
				<SemanaDeEnvios dias={data.semana} />
			</section>

			<!-- filtros -->
			<div class="mb-4 flex flex-wrap items-center gap-2.5">
				<label
					class="flex min-h-[42px] flex-[1_1_100%] items-center gap-2 rounded-field border-[1.5px] border-line bg-base-100 px-3 focus-within:border-primary lg:flex-[0_1_280px]"
				>
					<svg
						class="size-[15px] flex-none text-base-content/65"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
						><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" /><path
							d="M16 16l4.5 4.5"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/></svg
					>
					<input
						bind:value={busca}
						type="search"
						placeholder="Buscar módulo ou turma"
						aria-label="Buscar módulo ou turma"
						class="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[13.5px] outline-none"
					/>
				</label>
				<div
					class="-mx-4 flex flex-[1_1_100%] gap-1.5 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:flex-none lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
					role="group"
					aria-label="Filtrar módulos"
				>
					{#each FILTROS as f (f.id)}
						<button
							type="button"
							onclick={() => (filtro = f.id)}
							aria-pressed={filtro === f.id}
							class="flex min-h-[38px] flex-none motion-tap items-center gap-1.75 rounded-full border px-3 py-1.75 text-[12.5px] font-bold whitespace-nowrap {filtro ===
							f.id
								? 'border-primary bg-primary text-primary-content'
								: 'border-line bg-base-100 text-base-content'}"
						>
							{f.rotulo}
							<span class="font-mono text-[11.5px] opacity-80"
								>{data.modulos.filter(f.casa).length}</span
							>
						</button>
					{/each}
				</div>
			</div>

			<!-- a listagem -->
			<div class="grid gap-3.5">
				{#each visiveis as m (m.id)}
					{@const P = PILULA[m.estado]}
					<article
						class="overflow-hidden rounded-[16px] border border-line transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-[0_20px_40px_-32px_color-mix(in_oklab,var(--color-primary)_60%,transparent)]"
					>
						<div
							class="flex flex-wrap items-start gap-3 p-4 lg:flex-nowrap lg:gap-3.5 lg:px-5 lg:py-4.5"
						>
							<span
								class="grid size-11 flex-none place-items-center rounded-[12px] text-[14px] font-bold {CLASSE_DA_ETIQUETA[
									m.color
								]}">{m.sigla}</span
							>
							<div class="min-w-[200px] flex-1">
								{#if renomeando === m.id}
									<form
										onsubmit={(e) => {
											e.preventDefault();
											if (novoNome.trim()) void renomear(m);
										}}
										class="flex flex-wrap items-center gap-2"
									>
										<label class="sr-only" for="renomear-{m.id}">Novo nome de {m.name}</label>
										<input
											id="renomear-{m.id}"
											bind:value={novoNome}
											maxlength="80"
											required
											class="input min-h-10 min-w-0 flex-1 text-[15px] font-semibold"
											onkeydown={(e) => e.key === 'Escape' && (renomeando = null)}
										/>
										<button
											type="submit"
											disabled={pendente !== null || !novoNome.trim()}
											class="btn min-h-10 motion-tap gap-2 btn-primary text-[13px] font-bold"
										>
											{#if pendente === `renomear:${m.id}`}<Loading
													variant="fila"
													size={9}
													tone="current"
													label="Salvando"
												/>{/if}
											Salvar
										</button>
										<button
											type="button"
											onclick={() => (renomeando = null)}
											class="btn min-h-10 border border-line bg-transparent text-[13px] font-semibold text-base-content/70"
											>Cancelar</button
										>
									</form>
								{:else}
									<div class="mb-0.75 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
										<a
											href={resolve('/(studio)/modulos/[id]', { id: m.id })}
											class="text-[16.5px] font-bold text-base-content no-underline hover:text-primary"
											>{m.name}</a
										>
										<span
											class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap {P.classe}"
										>
											{@render icone(P.icone)}
											{P.texto}
										</span>
									</div>
								{/if}
								{#if m.description}
									<p class="mt-0.75 text-[13px] leading-normal text-pretty text-base-content/65">
										{m.description}
									</p>
								{/if}
							</div>
							<div class="flex flex-[1_1_100%] gap-1.5 lg:flex-none" data-menu>
								<a
									href={resolve('/(studio)/modulos/[id]', { id: m.id })}
									class="btn min-h-[42px] flex-1 motion-tap btn-outline text-[13px] font-bold whitespace-nowrap no-underline"
									>Abrir módulo</a
								>
								<div class="relative">
									<button
										type="button"
										id="menu-botao-{m.id}"
										onclick={() => (menu = menu === m.id ? null : m.id)}
										aria-haspopup="menu"
										aria-expanded={menu === m.id}
										aria-controls="menu-{m.id}"
										aria-label="Mais ações de {m.name}"
										title="Renomear, duplicar, apagar"
										class="grid size-[42px] place-items-center rounded-field border border-line text-base-content/65 transition-colors hover:bg-base-200 hover:text-base-content"
									>
										{#if pendente === `duplicar:${m.id}`}
											<Loading variant="fila" size={9} label="Duplicando" />
										{:else}
											<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"
												><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle
													cx="12"
													cy="12"
													r="1.6"
													fill="currentColor"
												/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg
											>
										{/if}
									</button>
									{#if menu === m.id}
										<div
											id="menu-{m.id}"
											role="menu"
											tabindex="-1"
											aria-label="Ações de {m.name}"
											use:focarPrimeiro
											onkeydown={navegarNoMenu}
											class="absolute end-0 top-full z-30 mt-1.5 grid min-w-[200px] animate-[en-fade-up_180ms_var(--ease-out-soft)_both] gap-0.5 rounded-[12px] border border-line bg-base-100 p-1.5 shadow-[0_18px_40px_-20px_rgba(20,18,31,0.45)]"
										>
											<button
												type="button"
												role="menuitem"
												onclick={() => iniciarRenomear(m)}
												class="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-start text-[13.5px] font-semibold hover:bg-base-200 focus-visible:bg-base-200"
											>
												{@render icone('M5 19h3l10-10-3-3L5 16z', 'size-4')}
												Renomear
											</button>
											<button
												type="button"
												role="menuitem"
												onclick={() => duplicar(m)}
												class="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-start text-[13.5px] font-semibold hover:bg-base-200 focus-visible:bg-base-200"
											>
												{@render icone('M8 8h11v11H8zM5 16V5h11', 'size-4')}
												Duplicar
											</button>
											<button
												type="button"
												role="menuitem"
												onclick={() => {
													menu = null;
													renomeando = null;
													apagando = m.id;
												}}
												class="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-start text-[13.5px] font-semibold text-error hover:bg-error/10 focus-visible:bg-error/10"
											>
												{@render icone('M6 7h12M9.5 7V5h5v2M8 7l.8 12h6.4L16 7', 'size-4')}
												Apagar
											</button>
										</div>
									{/if}
								</div>
							</div>
						</div>

						{#if erroCartao?.id === m.id}
							<p class="px-4 pb-3 text-[13px] font-semibold text-error lg:px-5" role="alert">
								{erroCartao.texto}
							</p>
						{/if}

						{#if apagando === m.id}
							<div class="border-t border-line bg-base-200 px-4 py-3.5 lg:px-5">
								<p class="mb-1.5 text-[13.5px] font-bold">Apagar {m.name}?</p>
								<p class="mb-3 max-w-[72ch] text-[13px] leading-relaxed text-base-content/65">
									As {plural(m.sequencia.length, 'atividade continua', 'atividades continuam')} na sua
									conta: só o agrupamento some.{m.turmas.length > 0
										? ` Os envios que ainda não saíram são cancelados nas ${plural(m.turmas.length, 'turma', 'turmas')}.`
										: ''} O que já saiu continua valendo, porque o link é da atividade.
								</p>
								<div class="flex flex-wrap gap-2">
									<button
										type="button"
										onclick={() => apagar(m)}
										disabled={pendente !== null}
										class="btn min-h-10 motion-tap gap-2 btn-error text-[13px] font-bold"
									>
										{#if pendente === `apagar:${m.id}`}<Loading
												variant="fila"
												size={9}
												tone="current"
												label="Apagando"
											/>{/if}
										Apagar de vez
									</button>
									<button
										type="button"
										onclick={() => (apagando = null)}
										class="btn min-h-10 btn-plain text-[13px]">Manter o módulo</button
									>
								</div>
							</div>
						{/if}

						<!-- a sequência -->
						<div
							class="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-line px-4 py-3 lg:px-5"
						>
							<span class="flex-none text-[12.5px] text-base-content/65"
								><strong class="font-bold text-base-content">{m.sequencia.length}</strong>
								{m.sequencia.length === 1 ? 'atividade' : 'atividades'} · {m.noAr ===
									m.sequencia.length && m.noAr > 0
									? 'todas no ar'
									: `${m.noAr} no ar`}</span
							>
							{#if m.sequencia.length > 0}
								<ol
									class="flex min-w-0 flex-1 list-none flex-wrap gap-1 p-0"
									aria-label="Sequência de {m.name}"
								>
									{#each m.sequencia as s, i (i)}
										<li
											title="{i + 1} · {s.titulo} · {s.estado === 'no-ar' ? 'no ar' : s.estado}"
											class="grid size-6.5 place-items-center rounded-[7px] font-mono text-[11px] font-medium {s.estado ===
											'no-ar'
												? 'bg-base-300 text-primary'
												: 'border-[1.5px] border-dashed border-base-content/55 text-base-content/65'}"
										>
											<span aria-hidden="true">{i + 1}</span>
											<span class="sr-only"
												>{s.titulo}: {s.estado === 'no-ar' ? 'no ar' : s.estado}</span
											>
										</li>
									{/each}
								</ol>
								{#if m.sequencia.some((s) => s.estado !== 'no-ar')}
									<span
										class="flex flex-none items-center gap-1.75 text-[12px] text-base-content/65"
									>
										<span
											class="size-3 rounded-[4px] border-[1.5px] border-dashed border-base-content/55"
										></span>
										rascunho
									</span>
								{/if}
							{:else}
								<span class="text-[12.5px] text-base-content/65 italic"
									>nenhuma atividade ainda</span
								>
							{/if}
						</div>

						<!-- os próximos 7 dias deste módulo -->
						<div class="border-t border-line px-4 py-3 lg:px-5">
							<p
								class="mb-2.5 text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase"
							>
								Próximos 7 dias
							</p>
							{#if m.semana.some((d) => d.envios.length > 0)}
								<SemanaDeEnvios dias={m.semana} rotulo="Próximos 7 dias de {m.name}" />
							{:else}
								<p class="flex items-center gap-2 text-[13px] text-base-content/65">
									{@render calendario()}
									{VAZIO_DA_SEMANA[m.estado](m)}
								</p>
							{/if}
						</div>

						<!-- as turmas -->
						{#if m.turmas.length > 0}
							<div class="border-t border-line bg-base-200">
								<div
									class="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_150px_120px] gap-4 px-5 pt-2.25 text-[10.5px] font-bold tracking-[0.09em] text-base-content/65 uppercase lg:grid"
								>
									<span>Turma · ritmo</span><span>Enviadas</span><span>Próximo envio</span><span
										>Terminaram</span
									>
								</div>
								{#each m.turmas as t (t.id)}
									{@const X = PROXIMO[t.tipo]}
									<div
										class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-line px-4 py-3 first:border-t-0 lg:mt-2.25 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_150px_120px] lg:gap-4 lg:border-t lg:px-5 lg:py-2.75 lg:first:border-t"
									>
										<span class="col-span-2 flex min-w-0 items-center gap-2.5 lg:col-span-1">
											<span
												class="flex-none rounded-[7px] px-2 py-1 text-[11.5px] font-bold {CLASSE_DA_ETIQUETA[
													t.cor
												]}">{t.sigla}</span
											>
											<span class="min-w-0">
												<span class="block truncate text-[13.5px] font-semibold">{t.nome}</span>
												<span class="block text-[12px] text-base-content/65">{t.ritmo}</span>
											</span>
										</span>
										<span class="col-start-1 grid min-w-0 gap-1.25 lg:col-start-auto">
											<span
												class="flex h-1.5 overflow-hidden rounded-full bg-base-300"
												aria-hidden="true"
											>
												<span
													class="origin-left animate-[en-grow-x_800ms_var(--ease-out-soft)_both] rounded-full {t.tipo ===
														'pausa' || t.tipo === 'fim'
														? 'bg-base-content/45'
														: 'bg-primary'}"
													style="width: {t.total > 0
														? Math.round((t.enviadas / t.total) * 100)
														: 0}%"
												></span>
											</span>
											<span class="font-mono text-[12px] text-base-content/65"
												>{t.enviadas} de {t.total}<span class="sr-only"> enviadas</span></span
											>
										</span>
										<span
											class="col-span-2 flex min-w-0 items-center gap-1.5 text-[12.5px] lg:col-span-1 {X.classe}"
										>
											{@render icone(X.icone, 'size-[13px]')}
											<span class="min-w-0">{t.prox}</span>
										</span>
										<span
											class="col-start-2 row-start-2 text-end text-[12.5px] text-base-content/65 lg:col-start-auto lg:row-start-auto lg:text-start"
										>
											{#if t.terminaram}
												<strong class="font-mono text-[13px] font-medium text-base-content"
													>{t.terminaram}</strong
												> na última
											{:else}
												<span aria-label="ainda sem envio">—</span>
											{/if}
										</span>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-line bg-base-200 px-4 py-3 lg:px-5"
							>
								<span class="min-w-[200px] flex-1 text-[13px] text-base-content/65"
									>Nenhuma turma recebe este módulo ainda. As atividades no ar já funcionam soltas.</span
								>
								<a
									href={resolve('/(studio)/modulos/[id]', { id: m.id })}
									class="flex items-center gap-1.75 px-0.5 py-1.5 text-[13px] font-bold text-primary no-underline"
								>
									{@render icone('M12 5v14M5 12h14', 'size-3.5')}
									Adicionar turma
								</a>
							</div>
						{/if}
					</article>
				{:else}
					<p
						class="rounded-[14px] border-[1.5px] border-dashed border-line p-5.5 text-center text-[13.5px] text-base-content/65"
					>
						Nenhum módulo neste filtro.
					</p>
				{/each}
			</div>
		{/if}
	</div>
</div>
