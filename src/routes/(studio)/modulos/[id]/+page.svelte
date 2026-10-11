<script lang="ts">
	// Um módulo aberto (docs/telas-modulos-professor.md 2). Responde, nesta
	// ordem: o que é este módulo, o que tem dentro e em que ordem, para quais
	// turmas ele vai, e quando cada coisa sai. A programação de cada turma abre
	// num painel lateral (`ProgramacaoPainel`), para o módulo não sair de vista.
	//
	// **Reordenar é arrastar E as setas**, como em "ordenar" do Player: arrastar
	// é o gesto natural; as setas funcionam no teclado e no leitor de tela, e
	// dizem o que fazem (design-system.md "Acessibilidade").
	//
	// **O único vermelho da tela é o envio que não saiu** — no aviso do topo e na
	// pílula da turma. A confirmação de envio NÃO é verde: enviado não é acertou.
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import AmbientShapes from '$lib/components/AmbientShapes.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import ProgramacaoPainel from '$lib/components/ProgramacaoPainel.svelte';
	import SemanaDeEnvios from '$lib/components/SemanaDeEnvios.svelte';
	import IdiomaTag from '$lib/components/IdiomaTag.svelte';
	import {
		CLASSE_DA_ETIQUETA,
		CORES_DE_ETIQUETA,
		etiquetaDaTurma,
		NOME_DA_COR,
		type CorDeEtiqueta
	} from '$lib/etiquetas';
	import { resumoDaProgramacao } from '$lib/modulos/programacao';
	import {
		contagemDeEnvios,
		estadoDaAlocacao,
		proximoEnvio,
		PILULA_DO_ESTADO,
		rotuloDoInstante,
		TEXTO_DO_MOTIVO
	} from '$lib/modulos/estado';
	import {
		adicionarAoModulo,
		alocarTurmas,
		apagarModulo,
		desalocarTurma,
		editarModulo,
		pausarProgramacao,
		removerDoModulo,
		reordenarModulo
	} from '../modulos.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Linha = (typeof data.modulo.atividades)[number];
	// A ordem na tela é LOCAL enquanto o professor mexe (derived GRAVÁVEL: arrastar
	// reatribui); volta a seguir o servidor a cada recarga, e vai a ele ao soltar.
	let ordem = $derived<Linha[]>([...data.modulo.atividades]);

	let pendente = $state<string | null>(null);
	let erro = $state<string | null>(null);

	async function rodar(qual: string, fn: () => Promise<void>) {
		pendente = qual;
		erro = null;
		try {
			await fn();
		} catch {
			erro = 'Não deu para concluir agora. Tente de novo em instantes.';
		} finally {
			pendente = null;
		}
	}

	// ── a ordem ──
	async function salvarOrdem(nova: Linha[]) {
		ordem = nova;
		await rodar('ordem', async () => {
			const r = await reordenarModulo({
				moduleId: data.modulo.id,
				activityIds: nova.map((a) => a.id)
			});
			if (!r.ok) erro = 'A ordem não foi salva — recarregue a página.';
			await invalidateAll();
		});
	}
	const aoArrastar = (e: CustomEvent<DndEvent<Linha>>) => (ordem = e.detail.items);
	const aoSoltar = (e: CustomEvent<DndEvent<Linha>>) => void salvarOrdem(e.detail.items);
	function mover(i: number, delta: -1 | 1) {
		const j = i + delta;
		if (j < 0 || j >= ordem.length) return;
		const nova = [...ordem];
		[nova[i], nova[j]] = [nova[j], nova[i]];
		void salvarOrdem(nova);
	}

	// ── acrescentar ──
	let acrescentando = $state(false);
	let escolhidas = $state<string[]>([]);
	function alternar(id: string) {
		escolhidas = escolhidas.includes(id) ? escolhidas.filter((x) => x !== id) : [...escolhidas, id];
	}
	async function acrescentar() {
		await rodar('acrescentar', async () => {
			await adicionarAoModulo({ moduleId: data.modulo.id, activityIds: escolhidas });
			escolhidas = [];
			acrescentando = false;
			await invalidateAll();
		});
	}

	// ── editar e apagar ──
	let editando = $state(false);
	let nome = $state('');
	let descricao = $state('');
	let cor = $state<CorDeEtiqueta>('violeta');
	function abrirEdicao() {
		nome = data.modulo.name;
		descricao = data.modulo.description ?? '';
		cor = data.modulo.color;
		editando = true;
	}
	async function salvarEdicao() {
		await rodar('editar', async () => {
			await editarModulo({
				moduleId: data.modulo.id,
				name: nome,
				description: descricao,
				color: cor
			});
			editando = false;
			await invalidateAll();
		});
	}
	let confirmandoApagar = $state(false);
	async function apagar() {
		await rodar('apagar', async () => {
			await apagarModulo({ moduleId: data.modulo.id });
			await goto(resolve('/(studio)/modulos'), { invalidateAll: true });
		});
	}

	// ── turmas do módulo ──
	let adicionando = $state(false);
	let removendo = $state<string | null>(null);
	// O painel aberto é o id da ALOCAÇÃO. Nasce do `?turma=` (vindo da tela da
	// turma) e muda com o clique. O derived gravável depende do VALOR do link, não
	// de `data`: cada ação termina num `invalidateAll()`, e preso a `data` ele
	// voltava ao valor do loader — o painel fechava sozinho depois de salvar.
	const painelDoLink = $derived(data.painelInicial);
	let painel = $derived<string | null>(painelDoLink);

	const idsDoModulo = $derived(ordem.map((a) => a.id));
	const turmas = $derived(
		data.alocacoes.map((a) => {
			const estado = estadoDaAlocacao(a);
			const prox = proximoEnvio(a.envios);
			const { enviadas, total } = contagemDeEnvios(a.programacao, a.envios, idsDoModulo);
			const falha = a.envios.find((e) => e.status === 'nao_saiu');
			const titulo = (id: string) => ordem.find((x) => x.id === id)?.title ?? 'uma atividade';
			const quando = a.programacao ? resumoDaProgramacao(a.programacao) : '';
			const resumo =
				estado === 'sem'
					? 'alocada · nada enviado ainda'
					: estado === 'falha' && falha
						? `${quando} · ${enviadas} de ${total} enviadas · ${titulo(falha.activityId)} esperando desde ${rotuloDoInstante(falha.dueAt)}`
						: `${quando} · ${enviadas} de ${total} enviadas${prox && !a.pausedAt ? ` · próxima ${rotuloDoInstante(prox.dueAt)}` : ''}`;
			return { ...a, estado, prox, resumo, falha };
		})
	);

	/** O primeiro envio que não saiu, para o aviso do topo. */
	const falhaDoTopo = $derived(turmas.find((t) => t.falha));
	const noAr = $derived(ordem.filter((a) => a.estado === 'no-ar').length);

	async function alocar(classroomId: string) {
		await rodar(`alocar:${classroomId}`, async () => {
			await alocarTurmas({ moduleId: data.modulo.id, classroomIds: [classroomId] });
			adicionando = false;
			await invalidateAll();
		});
	}
	async function tirar(allocationId: string) {
		await rodar(`tirar:${allocationId}`, async () => {
			await desalocarTurma({ allocationId });
			removendo = null;
			if (painel === allocationId) painel = null;
			await invalidateAll();
		});
	}
	async function pausar(allocationId: string, pausarAgora: boolean) {
		await rodar(`pausar:${allocationId}`, async () => {
			await pausarProgramacao({ allocationId, pausar: pausarAgora });
			await invalidateAll();
		});
	}

	const alocacaoAberta = $derived(data.alocacoes.find((a) => a.id === painel) ?? null);
	/** E-mails já programados nas OUTRAS alocações, por dia — o teto de 100 da prévia. */
	const cargaOutras = $derived.by(() => {
		const soma: Record<string, number> = {};
		for (const [id, porDia] of Object.entries(data.carga)) {
			if (id === painel) continue;
			for (const [dia, n] of Object.entries(porDia)) soma[dia] = (soma[dia] ?? 0) + n;
		}
		return soma;
	});

	// Mesmo cuidado do painel: a escolha sobrevive à recarga dos dados.
	const primeiraTurma = $derived(data.alocacoes[0]?.id ?? '');
	let previaTurma = $derived(primeiraTurma);
</script>

<svelte:head><title>{data.modulo.name} — Módulos — entendo</title></svelte:head>

<div class="pagina-studio">
	<div>
		<!-- 2.1 cabeçalho -->
		<div
			class="relative mb-4.5 overflow-hidden rounded-[16px] border border-line bg-base-200 px-4 py-4.5 lg:px-6 lg:py-5.5"
		>
			<AmbientShapes layout="corner" />
			<div class="relative">
				{#if !editando}
					<div class="mb-4.5 flex flex-wrap items-start gap-x-4.5 gap-y-3.5">
						<span
							class="grid size-[46px] flex-none place-items-center rounded-[13px] text-[15px] font-bold {CLASSE_DA_ETIQUETA[
								data.modulo.color
							]}">{etiquetaDaTurma(data.modulo.name)}</span
						>
						<div class="min-w-0 flex-1">
							<p
								class="mb-1 text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase"
							>
								Módulo
							</p>
							<h1
								class="mb-1.5 font-display text-[22px] font-semibold tracking-[-0.024em] lg:text-[28px]"
							>
								{data.modulo.name}
							</h1>
							{#if data.modulo.description}
								<p
									class="max-w-[60ch] text-[13.5px] leading-relaxed text-pretty text-base-content/65"
								>
									{data.modulo.description}
								</p>
							{/if}
						</div>
						<button
							type="button"
							onclick={abrirEdicao}
							class="btn min-h-[42px] flex-[1_1_100%] motion-tap gap-2 btn-plain text-[13.5px] font-semibold lg:flex-none"
						>
							<svg class="size-[15px] flex-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"
								><path
									d="M5 19h3l10-10-3-3L5 16z"
									stroke="currentColor"
									stroke-width="2"
									stroke-linejoin="round"
								/></svg
							>
							Editar módulo
						</button>
					</div>
				{:else}
					<div class="mb-4.5 grid max-w-[640px] gap-3">
						<label class="grid gap-1.5">
							<span class="text-[12.5px] font-bold">Nome</span>
							<input bind:value={nome} maxlength="80" class="input w-full" />
						</label>
						<label class="grid gap-1.5">
							<span class="text-[12.5px] font-bold"
								>Descrição <span class="font-medium text-base-content/65">· opcional</span></span
							>
							<textarea bind:value={descricao} rows="2" maxlength="400" class="textarea w-full"
							></textarea>
						</label>
						<fieldset class="grid gap-1.5 border-0 p-0">
							<legend class="mb-1.5 text-[12.5px] font-bold">Cor da etiqueta</legend>
							<div class="flex flex-wrap gap-1.75">
								{#each CORES_DE_ETIQUETA as opcao (opcao)}
									<button
										type="button"
										onclick={() => (cor = opcao)}
										aria-pressed={cor === opcao}
										aria-label={NOME_DA_COR[opcao]}
										title={NOME_DA_COR[opcao]}
										class="grid size-11 place-items-center rounded-[11px] border-2 p-0 transition-colors {cor ===
										opcao
											? 'border-primary bg-base-100'
											: 'border-line bg-base-100/60'}"
									>
										<span
											class="grid size-7.5 place-items-center rounded-[8px] text-[11px] font-bold {CLASSE_DA_ETIQUETA[
												opcao
											]}">{etiquetaDaTurma(nome || data.modulo.name)}</span
										>
									</button>
								{/each}
							</div>
						</fieldset>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={salvarEdicao}
								disabled={pendente !== null || !nome.trim()}
								class="btn min-h-[42px] motion-tap gap-2 btn-primary font-bold"
							>
								{#if pendente === 'editar'}<Loading
										variant="fila"
										size={10}
										tone="current"
										label="Salvando"
									/>{/if}
								Salvar
							</button>
							<button
								type="button"
								onclick={() => (editando = false)}
								class="btn min-h-[42px] border border-line bg-transparent font-semibold text-base-content/70"
								>Cancelar</button
							>
						</div>
					</div>
				{/if}
				<div class="flex flex-wrap gap-x-7.5 gap-y-3 border-t border-line pt-4">
					{#each [{ v: ordem.length, l: ordem.length === 1 ? 'atividade' : 'atividades', tom: '' }, { v: noAr, l: 'no ar', tom: 'text-primary' }, { v: turmas.length, l: turmas.length === 1 ? 'turma' : 'turmas', tom: '' }] as n (n.l)}
						<div>
							<div
								class="font-display text-[24px] leading-none font-extrabold tracking-[-0.025em] {n.tom}"
							>
								{n.v}
							</div>
							<div class="mt-1.25 text-[12px] text-base-content/65">{n.l}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- o único estado em vermelho: o envio que não saiu -->
		{#if falhaDoTopo?.falha}
			{@const f = falhaDoTopo.falha}
			{@const atividade = ordem.find((a) => a.id === f.activityId)}
			<div
				class="mb-6.5 flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-[13px] border border-error/32 bg-error/8 px-4 py-3.5"
			>
				<svg
					class="size-[19px] flex-none text-error"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
					><path
						d="M12 7.5v6M12 16.5h.01M12 3l9.5 17H2.5z"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				>
				<div class="min-w-[220px] flex-1">
					<p class="mb-1 text-[13.5px] font-bold">
						O envio de {rotuloDoInstante(f.dueAt)} para {falhaDoTopo.turma.name} não saiu
					</p>
					<p class="text-[12.5px] leading-relaxed text-base-content/65">
						{atividade?.title ?? 'A atividade'}
						{f.reason ? TEXTO_DO_MOTIVO[f.reason] : 'não pôde sair'}. O envio espera: {f.reason ===
						'audio'
							? 'ele tenta de novo sozinho em alguns minutos'
							: 'resolva e ele sai na próxima tentativa'}, sem pular para a seguinte.
					</p>
				</div>
				{#if atividade && f.reason !== 'audio'}
					<a
						href={resolve('/(studio)/atividades/[id]', { id: atividade.id })}
						class="btn min-h-10 flex-none btn-error text-[13px] font-bold no-underline"
						>{f.reason === 'arquivada' ? 'Abrir' : 'Publicar'} {atividade.title}</a
					>
				{/if}
			</div>
		{/if}

		{#if erro}<p class="mb-4 text-[13.5px] font-semibold text-error" role="alert">{erro}</p>{/if}

		<!-- próximos 7 dias deste módulo, em todas as turmas -->
		{#if turmas.length > 0}
			<section class="mb-7.5">
				<div class="mb-3 flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
					<h2 class="font-display text-[18px] font-semibold lg:text-[20px]">Próximos 7 dias</h2>
					<span class="text-[13px] text-base-content/65"
						>o que sai deste módulo, em todas as turmas</span
					>
					<span class="min-w-1 flex-1"></span>
					<!-- eslint-disable svelte/no-navigation-without-resolve -- rota resolvida mais o filtro do módulo. -->
					<a
						href={resolve('/(studio)/modulos/calendario') + '?modulo=' + data.modulo.id}
						class="flex items-center gap-1.75 px-0.5 py-1.5 text-[13px] font-bold text-primary no-underline"
					>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
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
						Ver no calendário
					</a>
				</div>
				<SemanaDeEnvios dias={data.semana} rotulo="Próximos 7 dias de {data.modulo.name}" />
			</section>
		{/if}

		<!-- 2.2 as atividades, na ordem -->
		<section class="mb-7.5">
			<div class="mb-2 flex flex-wrap items-baseline gap-x-3.5 gap-y-2.5">
				<h2 class="font-display text-[18px] font-semibold lg:text-[20px]">Atividades, na ordem</h2>
				<span class="text-[13px] text-base-content/65">a ordem do e-mail e do mapa do aluno</span>
				<span class="min-w-1 flex-1"></span>
				<button
					type="button"
					onclick={() => {
						acrescentando = !acrescentando;
						escolhidas = [];
					}}
					class="btn min-h-10 motion-tap gap-2 btn-plain text-[13px] font-semibold"
				>
					<svg class="size-[15px] flex-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"
						><path
							d="M12 5v14M5 12h14"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
						/></svg
					>
					Acrescentar atividades
				</button>
			</div>
			{#if turmas.length > 0}
				<p class="mb-3 flex items-center gap-2 text-[12.5px] text-base-content/65">
					<svg class="size-3.5 flex-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"
						><path
							d="M7 11V8a5 5 0 0110 0v3M5.5 11h13v9.5h-13z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/></svg
					>
					Reordenar muda só o que ainda não saiu. O que já foi enviado fica onde está.
				</p>
			{/if}

			{#if acrescentando}
				<div
					class="mb-3 animate-[en-fade-up_280ms_var(--ease-out-soft)_both] rounded-[14px] border border-primary/34 px-4 py-3.5"
				>
					<p class="mb-0.75 text-[13.5px] font-bold">Suas atividades que não estão no módulo</p>
					<p class="mb-2.5 text-[12.5px] text-base-content/65">
						As arquivadas ficam fora. As escolhidas entram no fim, e no fim da fila de cada turma.
					</p>
					{#if data.disponiveis.length === 0}
						<p class="text-[13px] text-base-content/65">Todas as suas atividades já estão aqui.</p>
					{:else}
						<div class="mb-3 grid max-h-[300px] gap-1 overflow-y-auto">
							{#each data.disponiveis as a (a.id)}
								<label
									class="flex min-h-11 cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2 hover:bg-base-200"
								>
									<input
										type="checkbox"
										class="checkbox flex-none checkbox-primary"
										checked={escolhidas.includes(a.id)}
										onchange={() => alternar(a.id)}
									/>
									<span class="min-w-0 flex-1 text-[14px] font-semibold">{a.title}</span>
									{#if a.level}<span class="text-[12px] text-base-content/65">{a.level}</span>{/if}
									<IdiomaTag tag={a.idioma} compacta />
									<span
										class="rounded-full px-2.25 py-0.75 text-[11.5px] font-bold whitespace-nowrap {a.noAr
											? 'bg-base-300 text-primary'
											: 'border-[1.5px] border-dashed border-line text-base-content/70'}"
										>{a.noAr ? 'no ar' : 'rascunho'}</span
									>
								</label>
							{/each}
						</div>
					{/if}
					<div class="flex gap-2">
						<button
							type="button"
							onclick={acrescentar}
							disabled={pendente !== null || escolhidas.length === 0}
							class="btn min-h-[42px] motion-tap gap-2 btn-primary font-bold"
						>
							{#if pendente === 'acrescentar'}<Loading
									variant="fila"
									size={10}
									tone="current"
									label="Acrescentando"
								/>{/if}
							{escolhidas.length
								? `Acrescentar ${escolhidas.length} ${escolhidas.length === 1 ? 'atividade' : 'atividades'}`
								: 'Acrescentar'}
						</button>
						<button
							type="button"
							onclick={() => (acrescentando = false)}
							class="btn min-h-[42px] btn-plain">Cancelar</button
						>
					</div>
				</div>
			{/if}

			{#if ordem.length > 0}
				<ol
					use:dndzone={{ items: ordem, flipDurationMs: 220 }}
					onconsider={aoArrastar}
					onfinalize={aoSoltar}
					class="list-none overflow-hidden rounded-[14px] border border-line p-0"
					aria-label="Atividades do módulo, na ordem"
				>
					{#each ordem as a, i (a.id)}
						<li
							class="flex cursor-grab flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-line bg-base-100 py-2.75 ps-3 pe-2.5 transition-colors last:border-b-0 hover:bg-base-200 active:cursor-grabbing lg:flex-nowrap lg:gap-3.5 lg:py-2.5 lg:ps-4 lg:pe-3"
						>
							<span class="flex min-w-0 flex-1 items-center gap-2.5">
								<svg
									class="h-4 w-3 flex-none text-base-content/50"
									viewBox="0 0 12 16"
									aria-hidden="true"
									><circle cx="3" cy="3" r="1.4" fill="currentColor" /><circle
										cx="9"
										cy="3"
										r="1.4"
										fill="currentColor"
									/><circle cx="3" cy="8" r="1.4" fill="currentColor" /><circle
										cx="9"
										cy="8"
										r="1.4"
										fill="currentColor"
									/><circle cx="3" cy="13" r="1.4" fill="currentColor" /><circle
										cx="9"
										cy="13"
										r="1.4"
										fill="currentColor"
									/></svg
								>
								<span class="w-5.5 flex-none font-mono text-[13px] text-base-content/65"
									>{String(i + 1).padStart(2, '0')}</span
								>
								<span class="min-w-0">
									<a
										href={resolve('/(studio)/atividades/[id]', { id: a.id })}
										class="mb-0.5 block text-[14.5px] font-semibold text-base-content no-underline hover:text-primary"
										>{a.title}</a
									>
									<span class="block text-[12.5px] text-base-content/65"
										>{a.level ? `${a.level} · ` : ''}{a.itemCount} questões</span
									>
								</span>
							</span>
							<IdiomaTag tag={a.targetLang} compacta />
							<span
								class="inline-flex flex-none items-center gap-1.5 rounded-full px-2.75 py-1.25 text-[12px] font-bold whitespace-nowrap {a.estado ===
								'no-ar'
									? 'bg-base-300 text-primary'
									: 'border-[1.5px] border-dashed border-line text-base-content/70'}"
							>
								<svg class="size-3" viewBox="0 0 24 24" fill="none" aria-hidden="true"
									><path
										d={a.estado === 'no-ar'
											? 'M5 12.5l4.5 4.5L19 7'
											: a.estado === 'arquivada'
												? 'M4 7h16v3H4zM5.5 10v9h13v-9M10 14h4'
												: 'M5 19h3l10-10-3-3L5 16z'}
										stroke="currentColor"
										stroke-width="2.4"
										stroke-linecap="round"
										stroke-linejoin="round"
									/></svg
								>
								{a.estado === 'no-ar' ? 'no ar' : a.estado}
							</span>
							<span class="flex flex-none gap-0.5">
								<button
									type="button"
									onclick={() => mover(i, -1)}
									disabled={i === 0 || pendente !== null}
									aria-label="Subir {a.title} para a posição {i}"
									title="Subir"
									class="grid size-9 place-items-center rounded-[9px] text-base-content/65 hover:bg-base-300 hover:text-primary disabled:opacity-40"
								>
									<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"
										><path
											d="M6 14l6-6 6 6"
											stroke="currentColor"
											stroke-width="2.2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/></svg
									>
								</button>
								<button
									type="button"
									onclick={() => mover(i, 1)}
									disabled={i === ordem.length - 1 || pendente !== null}
									aria-label="Descer {a.title} para a posição {i + 2}"
									title="Descer"
									class="grid size-9 place-items-center rounded-[9px] text-base-content/65 hover:bg-base-300 hover:text-primary disabled:opacity-40"
								>
									<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"
										><path
											d="M6 10l6 6 6-6"
											stroke="currentColor"
											stroke-width="2.2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/></svg
									>
								</button>
								<button
									type="button"
									onclick={() =>
										rodar('remover', async () => {
											await removerDoModulo({ moduleId: data.modulo.id, activityId: a.id });
											await invalidateAll();
										})}
									disabled={pendente !== null}
									aria-label="Tirar {a.title} do módulo"
									title="Tirar do módulo · a atividade continua na sua conta"
									class="grid size-9 place-items-center rounded-[9px] text-base-content/65 hover:bg-base-300 hover:text-base-content"
								>
									<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"
										><path
											d="M6 6l12 12M18 6L6 18"
											stroke="currentColor"
											stroke-width="2.2"
											stroke-linecap="round"
										/></svg
									>
								</button>
							</span>
						</li>
					{/each}
				</ol>
			{:else}
				<p
					class="rounded-[14px] border border-dashed border-line px-4 py-5 text-[13.5px] text-base-content/65"
				>
					Nenhuma atividade ainda. "Acrescentar atividades" põe aqui as que entram neste módulo.
				</p>
			{/if}
		</section>

		<!-- 2.3 turmas do módulo -->
		<section class="mb-7.5">
			<div class="mb-3.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-2.5">
				<h2 class="font-display text-[18px] font-semibold lg:text-[20px]">Turmas do módulo</h2>
				<span class="text-[13px] text-base-content/65"
					>só uma turma daqui recebe envio do módulo</span
				>
				<span class="min-w-1 flex-1"></span>
				<button
					type="button"
					onclick={() => (adicionando = !adicionando)}
					class="btn min-h-10 motion-tap gap-2 btn-plain text-[13px] font-semibold"
				>
					<svg class="size-[15px] flex-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"
						><path
							d="M12 5v14M5 12h14"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
						/></svg
					>
					Adicionar turma
				</button>
			</div>

			{#if adicionando}
				<div
					class="mb-3 flex animate-[en-fade-up_280ms_var(--ease-out-soft)_both] flex-wrap items-center gap-2 rounded-[14px] border border-primary/34 px-3.5 py-3"
				>
					<span class="me-1 text-[13px] text-base-content/65">Suas turmas fora deste módulo:</span>
					{#each data.livres as t (t.id)}
						<button
							type="button"
							onclick={() => alocar(t.id)}
							disabled={pendente !== null}
							class="flex min-h-[42px] motion-tap items-center gap-2 rounded-[10px] border border-line bg-base-100 py-1.75 ps-1.75 pe-3 text-[13px] font-semibold hover:border-primary"
						>
							<span
								class="grid size-7 place-items-center rounded-[8px] text-[11px] font-bold {CLASSE_DA_ETIQUETA[
									t.color
								]}">{etiquetaDaTurma(t.name)}</span
							>
							{t.name}
							{#if pendente === `alocar:${t.id}`}<Loading
									variant="fila"
									size={9}
									label="Adicionando"
								/>{/if}
						</button>
					{:else}
						<span class="text-[13px] text-base-content/65 italic"
							>todas já estão aqui · <a href={resolve('/(studio)/turmas/nova')}>criar uma turma</a
							></span
						>
					{/each}
				</div>
			{/if}

			{#if turmas.length === 0}
				<p
					class="rounded-[14px] border border-dashed border-line px-4 py-5 text-[13.5px] leading-relaxed text-base-content/65"
				>
					Nenhuma turma ainda. "Adicionar turma" põe a turma aqui, e daí você programa quando cada
					atividade sai para ela — tudo de uma vez, toda quinta ou em datas fixas.
				</p>
			{:else}
				<div class="grid gap-2.5">
					{#each turmas as t (t.id)}
						{@const E = PILULA_DO_ESTADO[t.estado]}
						<div class="overflow-hidden rounded-[14px] border border-line">
							<div
								class="flex flex-wrap items-center gap-x-3 gap-y-2.5 p-3.5 lg:flex-nowrap lg:gap-3.5 lg:px-4"
							>
								<span class="flex min-w-0 flex-1 items-center gap-3">
									<span
										class="grid size-[38px] flex-none place-items-center rounded-[10px] text-[12px] font-bold {CLASSE_DA_ETIQUETA[
											t.turma.color
										]}">{etiquetaDaTurma(t.turma.name)}</span
									>
									<span class="min-w-0">
										<span class="mb-0.75 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
											<span class="text-[15px] font-semibold">{t.turma.name}</span>
											<span class="text-[12.5px] text-base-content/65"
												>{t.turma.alunos} alunos · {t.turma.comEmail > 0
													? `${t.turma.comEmail} com e-mail`
													: 'nenhum com e-mail'}</span
											>
										</span>
										<span class="block text-[12.5px] text-pretty text-base-content/65"
											>{t.resumo}</span
										>
									</span>
								</span>
								<span
									class="inline-flex flex-none items-center gap-1.75 rounded-full px-2.75 py-1.25 text-[12px] font-bold whitespace-nowrap {E.classe}"
								>
									<svg class="size-3.25" viewBox="0 0 24 24" fill="none" aria-hidden="true"
										><path
											d={E.icone}
											stroke="currentColor"
											stroke-width="2.2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/></svg
									>
									{E.texto}
								</span>
								<span class="flex flex-none items-center gap-1">
									<button
										type="button"
										onclick={() => (painel = t.id)}
										class="btn min-h-10 motion-tap btn-outline text-[13px] font-bold whitespace-nowrap"
										>Programação</button
									>
									{#if t.programacao && t.estado !== 'concluida'}
										<button
											type="button"
											onclick={() => pausar(t.id, !t.pausedAt)}
											disabled={pendente !== null}
											aria-label={t.pausedAt ? 'Retomar a programação' : 'Pausar a programação'}
											title={t.pausedAt ? 'Retomar a programação' : 'Pausar a programação'}
											class="grid size-[38px] place-items-center rounded-[9px] text-base-content/65 hover:bg-base-300 hover:text-primary"
										>
											{#if pendente === `pausar:${t.id}`}
												<Loading variant="fila" size={9} label="Salvando" />
											{:else}
												<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"
													><path
														d={t.pausedAt ? 'M7 5v14l11-7z' : 'M9 6v12M15 6v12'}
														stroke="currentColor"
														stroke-width="2.2"
														stroke-linecap="round"
														stroke-linejoin="round"
													/></svg
												>
											{/if}
										</button>
									{/if}
									<button
										type="button"
										onclick={() => (removendo = removendo === t.id ? null : t.id)}
										aria-label="Tirar {t.turma.name} do módulo"
										title="Tirar {t.turma.name} do módulo"
										class="grid size-[38px] place-items-center rounded-[9px] text-base-content/65 hover:bg-error/12 hover:text-error"
									>
										<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"
											><path
												d="M6 7h12M9.5 7V5h5v2M8 7l.8 12h6.4L16 7"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/></svg
										>
									</button>
								</span>
							</div>
							{#if removendo === t.id}
								<div class="border-t border-line bg-base-200 px-4.5 py-3.5">
									<p class="mb-2 text-[13.5px] font-bold">Tirar {t.turma.name} do módulo?</p>
									<ul class="mb-3 ps-4.5 text-[13px] leading-relaxed text-base-content/65">
										<li>Os envios futuros desta turma são cancelados.</li>
										<li>O que já foi enviado continua valendo: o link é da atividade.</li>
										<li>O módulo some do mapa dos alunos desta turma.</li>
									</ul>
									<div class="flex flex-wrap gap-2">
										<button
											type="button"
											onclick={() => tirar(t.id)}
											disabled={pendente !== null}
											class="btn min-h-10 motion-tap gap-2 btn-outline-error text-[13px] font-bold"
										>
											{#if pendente === `tirar:${t.id}`}<Loading
													variant="fila"
													size={9}
													tone="current"
													label="Tirando"
												/>{/if}
											Tirar a turma
										</button>
										<button
											type="button"
											onclick={() => (removendo = null)}
											class="btn min-h-10 btn-plain text-[13px]">Manter</button
										>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- 2.5 histórico de envios -->
		{#if data.historico.length > 0}
			<section class="mb-7.5">
				<div class="mb-3.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-2.5">
					<h2 class="font-display text-[18px] font-semibold lg:text-[20px]">Envios</h2>
					<span class="text-[13px] text-base-content/65"
						>cada linha abre o resultado daquela atividade</span
					>
				</div>
				<div class="grid gap-2">
					{#each data.historico as h (h.id)}
						<a
							href={resolve('/(studio)/resultados/[activityId]', { activityId: h.atividade.id })}
							class="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[13px] border border-line px-3.5 py-3 text-base-content no-underline transition-colors hover:border-primary hover:bg-base-200 lg:px-4"
						>
							<span class="w-23 flex-none font-mono text-[12.5px] text-base-content/65"
								>{rotuloDoInstante(h.quando)}</span
							>
							<span
								class="flex-none rounded-[7px] px-2 py-1 text-[12px] font-bold {CLASSE_DA_ETIQUETA[
									h.turma.color
								]}">{etiquetaDaTurma(h.turma.name)}</span
							>
							<span class="min-w-[150px] flex-1 text-[14px] font-semibold">{h.atividade.title}</span
							>
							<span class="flex flex-none gap-4.5 font-mono text-[13px]">
								{#if h.porEmail}
									<span
										><span class="font-sans text-[12px] text-base-content/65"
											>e-mails
										</span>{h.emails}</span
									>
								{:else}
									<span class="font-sans text-[12px] text-base-content/65">no mapa, sem e-mail</span
									>
								{/if}
								<span
									><span class="font-sans text-[12px] text-base-content/65"
										>abriram
									</span>{h.abriram}/{h.convites}</span
								>
								<span class="text-primary"
									><span class="font-sans text-[12px] text-base-content/65"
										>terminaram
									</span>{h.terminaram}/{h.convites}</span
								>
							</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- 2.6 ver como o aluno vê -->
		{#if turmas.length > 0}
			<div
				class="mb-7.5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-dashed border-line px-4.5 py-4"
			>
				<div class="min-w-[230px] flex-1">
					<p class="mb-1 text-[14px] font-bold">Ver como o aluno vê</p>
					<p class="text-[12.5px] leading-relaxed text-pretty text-base-content/65">
						O mapa das fases com a programação de uma turma: o que já está liberado e o que abre em
						cada data. Sem progresso de aluno nenhum.
					</p>
				</div>
				<select
					bind:value={previaTurma}
					class="select min-h-[42px] w-auto"
					aria-label="Turma da prévia"
				>
					{#each turmas as t (t.id)}
						<option value={t.id}>{t.turma.name}</option>
					{/each}
				</select>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- rota resolvida mais a query da turma. -->
				<a
					href={resolve('/(studio)/modulos/[id]/mapa', { id: data.modulo.id }) +
						'?turma=' +
						previaTurma}
					class="btn min-h-[42px] flex-none btn-outline text-[13px] font-bold no-underline"
					>Abrir a prévia do mapa</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		{/if}

		<!-- apagar: consequência em texto antes de perguntar -->
		<div class="rounded-[14px] border border-error/28 px-5.5 py-5">
			<h3 class="mb-2 text-[15px] font-bold">Apagar este módulo</h3>
			<p class="mb-4 max-w-[76ch] text-[13px] leading-relaxed text-pretty text-base-content/65">
				As {ordem.length} atividades continuam na sua conta: só o agrupamento some.{turmas.length >
				0
					? ` Os envios programados que ainda não saíram são cancelados nas ${turmas.length} ${turmas.length === 1 ? 'turma' : 'turmas'}.`
					: ''} Os que já saíram continuam valendo, porque o link é da atividade, não do módulo.
			</p>
			{#if confirmandoApagar}
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						onclick={apagar}
						disabled={pendente !== null}
						class="btn min-h-[42px] motion-tap gap-2 btn-error font-bold"
					>
						{#if pendente === 'apagar'}<Loading
								variant="fila"
								size={10}
								tone="current"
								label="Apagando"
							/>{/if}
						Apagar de vez
					</button>
					<button
						type="button"
						onclick={() => (confirmandoApagar = false)}
						class="btn min-h-[42px] btn-plain">Manter o módulo</button
					>
				</div>
			{:else}
				<button
					type="button"
					onclick={() => (confirmandoApagar = true)}
					class="btn min-h-[42px] motion-tap btn-outline-error font-bold">Apagar módulo</button
				>
			{/if}
		</div>
	</div>
</div>

{#if alocacaoAberta}
	{#key alocacaoAberta.id}
		<ProgramacaoPainel
			alocacao={alocacaoAberta}
			atividades={ordem}
			hoje={data.hoje}
			{cargaOutras}
			outras={data.alocacoes
				.filter((a) => a.id !== alocacaoAberta.id)
				.map((a) => ({ id: a.id, nome: a.turma.name, programacao: a.programacao }))}
			onfechar={() => (painel = null)}
			onmudou={() => invalidateAll()}
		/>
	{/key}
{/if}
