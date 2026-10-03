<script lang="ts">
	/**
	 * A busca do cabeçalho do Studio. Uma caixa só para as três coisas que o
	 * professor procura — atividade, material e turma —, com o resultado em
	 * bandeja e a categoria escrita em cada linha.
	 *
	 * Categoria em TEXTO, não só por cor ou por ordem: "Present perfect" pode ser
	 * o título de uma atividade e o começo de um material, e sem o rótulo os dois
	 * ficam iguais na lista.
	 *
	 * A pesquisa acontece no servidor (é lá que estão os dados e o escopo por
	 * professor), com um atraso curto: uma ida por tecla digitada seria uma
	 * consulta por letra sem nenhum ganho.
	 */
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Loading from '$lib/components/Loading.svelte';
	import {
		buscarNoStudio,
		type CategoriaBusca,
		type ResultadoBusca
	} from '../../routes/(studio)/studio.remote';

	const categorias: { id: CategoriaBusca; label: string; plural: string }[] = [
		{ id: 'atividade', label: 'Atividade', plural: 'Atividades' },
		{ id: 'material', label: 'Material', plural: 'Materiais' },
		{ id: 'turma', label: 'Turma', plural: 'Turmas' }
	];

	const cor: Record<CategoriaBusca, string> = {
		atividade: 'bg-base-300 text-primary',
		material: 'bg-accent/12 text-accent',
		turma: 'bg-primary/12 text-primary'
	};

	let termo = $state('');
	let filtros = $state<CategoriaBusca[]>([]);
	let aberto = $state(false);
	let buscando = $state(false);
	let resultados = $state<ResultadoBusca[]>([]);
	let destaque = $state(-1);
	let campo = $state<HTMLInputElement | null>(null);

	// O termo que a última resposta respondeu. Sem isto, uma consulta lenta que
	// volta depois de uma rápida sobrescreve o resultado certo pelo velho.
	let respondido = '';
	let timer: ReturnType<typeof setTimeout> | undefined;

	function agendar() {
		clearTimeout(timer);
		const alvo = termo;
		if (alvo.trim().length < 2) {
			resultados = [];
			buscando = false;
			return;
		}
		buscando = true;
		timer = setTimeout(async () => {
			try {
				const achados = await buscarNoStudio({ termo: alvo, categorias: filtros });
				// Chegou fora de ordem? Descarta — o campo já está noutro termo.
				if (alvo !== termo) return;
				respondido = alvo;
				resultados = achados;
				destaque = -1;
			} finally {
				if (alvo === termo) buscando = false;
			}
		}, 220);
	}

	function alternarFiltro(id: CategoriaBusca) {
		filtros = filtros.includes(id) ? filtros.filter((f) => f !== id) : [...filtros, id];
		agendar();
	}

	function destino(r: ResultadoBusca): string {
		if (r.categoria === 'atividade') {
			return resolve('/(studio)/atividades/[id]', { id: r.id });
		}
		if (r.categoria === 'turma') return resolve('/(studio)/turmas/[id]', { id: r.id });
		// Material não tem tela própria: a biblioteca é onde ele se edita.
		return resolve('/(studio)/materiais');
	}

	async function abrir(r: ResultadoBusca) {
		aberto = false;
		termo = '';
		resultados = [];
		// `destino` já resolveu cada rota com `resolve()` e um literal; o lint não
		// tem como ver isso através da variável (mesma isenção do href de
		// Button.svelte — components.md).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(destino(r));
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			aberto = false;
			campo?.blur();
			return;
		}
		if (resultados.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			destaque = (destaque + 1) % resultados.length;
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			destaque = destaque <= 0 ? resultados.length - 1 : destaque - 1;
			return;
		}
		if (e.key === 'Enter') {
			// Sem nada destacado o Enter abre o primeiro — é o que o olho espera de
			// uma bandeja com um resultado só.
			const escolhido = resultados[destaque >= 0 ? destaque : 0];
			if (escolhido) {
				e.preventDefault();
				void abrir(escolhido);
			}
		}
	}

	// "Nada encontrado" só depois de a resposta CHEGAR para este termo: enquanto
	// a consulta anterior ainda vale, a bandeja diria que não achou algo que nem
	// foi procurado.
	const semResultado = $derived(
		!buscando && termo.trim().length >= 2 && respondido === termo && resultados.length === 0
	);
</script>

<!-- `onfocusout` no container e não no input: clicar num resultado tira o foco
     do campo, e fechar ali fecharia a bandeja antes do clique chegar. -->
<div
	class="relative"
	onfocusout={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) aberto = false;
	}}
>
	<label class="flex h-[37px] w-[260px] items-center gap-[9px] rounded-full bg-base-200 px-3.5">
		<svg
			class="size-4 shrink-0 text-base-content/50"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" />
			<path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		</svg>
		<span class="sr-only">Buscar atividades, materiais e turmas</span>
		<input
			bind:this={campo}
			bind:value={termo}
			oninput={() => {
				aberto = true;
				agendar();
			}}
			onfocus={() => (aberto = true)}
			onkeydown={onKey}
			type="search"
			placeholder="Buscar"
			role="combobox"
			aria-expanded={aberto}
			aria-controls="busca-studio"
			aria-autocomplete="list"
			class="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-base-content/50"
		/>
		{#if buscando}
			<Loading variant="fila" size={11} label="Buscando" />
		{/if}
	</label>

	{#if aberto}
		<div
			id="busca-studio"
			class="absolute end-0 top-[43px] z-50 w-[380px] overflow-hidden rounded-box border border-line bg-base-100 shadow-[0_18px_44px_-24px_rgb(var(--shadow)/0.55)]"
		>
			<div class="flex flex-wrap items-center gap-1.5 border-b border-line bg-base-200 px-3 py-2.5">
				<button
					type="button"
					onclick={() => {
						filtros = [];
						agendar();
					}}
					class="rounded-full px-2.5 py-1 text-[12px] transition-colors
					       {filtros.length === 0
						? 'bg-base-300 font-bold text-primary'
						: 'border border-line bg-base-100 text-base-content/65'}"
				>
					Tudo
				</button>
				{#each categorias as c (c.id)}
					<button
						type="button"
						onclick={() => alternarFiltro(c.id)}
						aria-pressed={filtros.includes(c.id)}
						class="rounded-full px-2.5 py-1 text-[12px] transition-colors
						       {filtros.includes(c.id)
							? 'bg-base-300 font-bold text-primary'
							: 'border border-line bg-base-100 text-base-content/65'}"
					>
						{c.plural}
					</button>
				{/each}
			</div>

			{#if termo.trim().length < 2}
				<p class="px-3.5 py-4 text-[13px] text-base-content/65">
					Digite ao menos duas letras. A busca cobre suas atividades, materiais e turmas.
				</p>
			{:else if semResultado}
				<p class="px-3.5 py-4 text-[13px] text-base-content/65">
					Nada encontrado para “{termo.trim()}”.
				</p>
			{:else}
				<ul class="max-h-[380px] list-none overflow-y-auto p-0">
					{#each resultados as r, i (r.categoria + r.id)}
						<li>
							<button
								type="button"
								onclick={() => abrir(r)}
								onmouseenter={() => (destaque = i)}
								class="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-start last:border-0
								       {destaque === i ? 'bg-base-200' : ''}"
							>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-[13.5px] font-semibold text-base-content">
										{r.titulo}
									</span>
									<span class="block truncate text-[12px] text-base-content/65">{r.detalhe}</span>
								</span>
								<!-- A categoria vai escrita: "Present perfect" pode ser uma
								     atividade e um material ao mesmo tempo. -->
								<span
									class="shrink-0 rounded-full px-2 py-[3px] text-[10.5px] font-bold tracking-[0.05em] uppercase {cor[
										r.categoria
									]}"
								>
									{categorias.find((c) => c.id === r.categoria)?.label}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
