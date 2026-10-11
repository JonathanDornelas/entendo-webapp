<script lang="ts">
	// Criar turma. Tarefa única, como o wizard de atividade — por isso
	// `+page@.svelte`: reseta para o layout raiz e a barra lateral do Studio sai
	// do caminho.
	//
	// Aluno sem e-mail é PERMITIDO e isso é dito no cadastro, não depois: ele
	// existe na chamada e nos resultados, e simplesmente não recebe convite.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parseAlunos } from '$lib/turmas/parse-alunos';
	import { languageLabels } from '$lib/kernel/language/profiles';
	import Loading from '$lib/components/Loading.svelte';
	import {
		CLASSE_DA_ETIQUETA,
		CORES_DE_ETIQUETA,
		etiquetaDaTurma,
		NOME_DA_COR,
		type CorDeEtiqueta
	} from '$lib/etiquetas';
	import { criarTurma } from '../turmas.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	interface LinhaUmAUm {
		name: string;
		email: string;
	}

	let nome = $state('');
	// Nasce no idioma que o professor ensina, quando é um só (o loader decide).
	const idiomaDoPerfil = $derived(data.idiomaPadrao);
	let idioma = $derived(idiomaDoPerfil);
	let cor = $state<CorDeEtiqueta>('violeta');
	/** Falha do servidor é DITA — o botão não pode só voltar ao normal sem explicação. */
	let erro = $state<string | null>(null);
	const sigla = $derived(nome.trim() ? etiquetaDaTurma(nome) : '7B');
	// `?modo=lote` é a entrada "Colar uma lista de alunos" da lista vazia de turmas:
	// quem chega por ela já tem a lista na mão e não deve clicar de novo aqui.
	let modo = $state<'um' | 'lote'>(page.url.searchParams.get('modo') === 'lote' ? 'lote' : 'um');
	let linhas = $state<LinhaUmAUm[]>([
		{ name: '', email: '' },
		{ name: '', email: '' },
		{ name: '', email: '' }
	]);
	let colado = $state('');

	// O parser é o MESMO do servidor: o número da prévia é o número que vai ser
	// gravado. Nenhuma linha é descartada em silêncio.
	const linhasColadas = $derived(modo === 'lote' ? parseAlunos(colado) : []);

	const umAUmPreenchidas = $derived(linhas.filter((l) => l.name.trim()));
	const alunosJson = $derived(
		JSON.stringify(
			umAUmPreenchidas.map((l) => ({ name: l.name.trim(), email: l.email.trim() || null }))
		)
	);

	/** O que a linha vai virar — dito na própria linha, não num aviso solto. */
	function estadoDaLinha(linha: LinhaUmAUm): { texto: string; tom: string } {
		const email = linha.email.trim();
		if (!email) return { texto: 'sem e-mail', tom: 'text-base-content/55' };
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
			? { texto: 'recebe convite', tom: 'text-primary' }
			: { texto: 'e-mail incompleto', tom: 'text-error' };
	}

	const total = $derived(
		modo === 'lote'
			? linhasColadas.filter((l) => l.status !== 'sem-nome').length
			: umAUmPreenchidas.length
	);
	const comEmail = $derived(
		modo === 'lote'
			? linhasColadas.filter((l) => l.status === 'com-email').length
			: umAUmPreenchidas.filter((l) => estadoDaLinha(l).texto === 'recebe convite').length
	);
	const forasDeLinha = $derived(
		linhasColadas.filter((l) => l.status === 'sem-nome' || l.status === 'email-invalido')
	);

	function adicionarLinha() {
		linhas = [...linhas, { name: '', email: '' }];
	}
	function removerLinha(i: number) {
		linhas = linhas.filter((_, j) => j !== i);
	}

	const exemploLista = [
		'Juliana Pereira · juliana.p@escola.com.br',
		'Marcos Antunes · marcos.a@escola.com.br',
		'Bruna Okamoto'
	].join('\n');
</script>

<svelte:head><title>Nova turma — entendo</title></svelte:head>

<div class="min-h-dvh bg-base-200 py-6 lg:py-8">
	<form
		{...criarTurma.enhance(async ({ submit }) => {
			erro = null;
			try {
				// Sucesso redireciona para a turma criada.
				await submit();
			} catch {
				erro = 'Não deu para criar a turma agora. Tente de novo em instantes.';
			}
		})}
		class="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[52rem] flex-col overflow-hidden rounded-box border border-line bg-base-100 lg:min-h-[calc(100dvh-4rem)]"
	>
		<input type="hidden" name="modo" value={modo} />
		<input type="hidden" name="color" value={cor} />
		{#if modo === 'um'}
			<input type="hidden" name="alunos" value={alunosJson} />
		{/if}

		<header
			class="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-base-200 px-gutter-sm py-3.5"
		>
			<a
				href={resolve('/(studio)/turmas')}
				class="grid size-[2.1rem] shrink-0 place-items-center rounded-full bg-base-100 text-base-content no-underline transition-transform hover:-translate-x-0.5"
				aria-label="Voltar para turmas"
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
			</a>
			<span class="text-[0.84rem] text-base-content/65">Turmas</span>
			<span class="text-base-content/40" aria-hidden="true">›</span>
			<span class="text-[0.84rem] font-semibold">Nova turma</span>
			<div class="flex-1"></div>
			<span
				class="hidden items-center gap-2 rounded-full border border-line bg-base-100 px-3 py-1.5 text-[0.78rem] text-base-content/65 sm:flex"
			>
				<svg class="size-[0.9rem] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
				Nome e e-mail. Mais nada.
			</span>
		</header>

		<div class="flex-1 overflow-y-auto px-gutter py-gutter-sm">
			<h1 class="mb-2 font-display text-title font-semibold tracking-[-0.02em]">Nova turma</h1>
			<p class="mb-6 max-w-[52ch] text-[0.92rem] leading-relaxed text-base-content/65">
				A turma existe para o aluno chegar pelo nome certo e para você não redistribuir link toda
				semana. Nome é o único campo obrigatório.
			</p>

			<label class="mb-1.5 block">
				<span class="mb-1.5 flex items-baseline gap-2 text-[0.84rem] font-semibold">
					Nome da turma
					<span class="text-[0.75rem] font-normal text-primary">obrigatório</span>
				</span>
				<input
					name="name"
					bind:value={nome}
					required
					maxlength="60"
					placeholder="7º B — inglês"
					class="input w-full text-[0.98rem]"
				/>
			</label>
			<p class="mb-5 text-[0.78rem] text-base-content/65">
				O aluno vê este nome no e-mail do convite.
			</p>

			<span class="mb-1.5 flex items-baseline gap-2 text-[0.84rem] font-semibold">
				Idioma que a turma estuda
				<span class="text-[0.75rem] font-normal text-base-content/65">opcional</span>
			</span>
			<input type="hidden" name="languageLabel" value={idioma} />
			<div class="mb-1.5 flex flex-wrap gap-2">
				{#each Object.keys(languageLabels) as rotulo (rotulo)}
					<button
						type="button"
						onclick={() => (idioma = idioma === rotulo ? '' : rotulo)}
						class="rounded-full px-3.5 py-2 text-[0.84rem] transition-transform duration-150 hover:-translate-y-0.5
						       {idioma === rotulo
							? 'bg-primary font-bold text-primary-content'
							: 'border border-line bg-base-100 font-semibold text-base-content/70'}"
						>{rotulo}</button
					>
				{/each}
			</div>
			<p class="mb-6 text-[0.78rem] text-base-content/65">
				Só serve para filtrar atividades desta turma. Não muda o conteúdo.
			</p>

			<span class="mb-1.5 block text-[0.84rem] font-semibold">Cor da etiqueta</span>
			<!-- A etiqueta com a sigla, como ela vai aparecer na lista e no cabeçalho
			     — o mesmo seletor do módulo. -->
			<div class="mb-7 flex flex-wrap gap-1.75">
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

			<div class="mb-3.5 flex flex-wrap items-baseline gap-3 border-t border-line pt-6">
				<h2 class="font-display text-section font-semibold">Alunos</h2>
				<div class="flex-1"></div>
				<span class="text-[0.82rem] text-base-content/65">
					{total}
					{total === 1 ? 'aluno' : 'alunos'} · {comEmail} com e-mail
				</span>
			</div>

			<div class="mb-4 inline-flex gap-1 rounded-full bg-base-200 p-1">
				{#each [{ id: 'um' as const, label: 'Um a um' }, { id: 'lote' as const, label: 'Colar uma lista' }] as opcao (opcao.id)}
					<button
						type="button"
						onclick={() => (modo = opcao.id)}
						class="rounded-full px-4 py-2 text-[0.84rem] transition-colors
						       {modo === opcao.id
							? 'bg-primary font-bold text-primary-content'
							: 'font-semibold text-base-content/65'}">{opcao.label}</button
					>
				{/each}
			</div>

			{#if modo === 'um'}
				<div class="grid gap-2">
					{#each linhas as linha, i (i)}
						{@const estado = estadoDaLinha(linha)}
						<div
							class="flex min-w-0 flex-wrap items-center gap-2 rounded-box border border-line bg-base-200 p-2 sm:flex-nowrap"
						>
							<span class="shrink-0 font-mono text-[0.72rem] text-base-content/55"
								>{String(i + 1).padStart(2, '0')}</span
							>
							<input
								bind:value={linha.name}
								placeholder="Nome do aluno"
								class="input h-auto min-w-0 flex-1 py-2 text-[0.9rem]"
								aria-label="Nome do aluno {i + 1}"
							/>
							<input
								bind:value={linha.email}
								type="email"
								placeholder="email@escola.com (opcional)"
								class="input h-auto min-w-0 flex-1 py-2 text-[0.9rem]"
								aria-label="E-mail do aluno {i + 1}"
							/>
							<span
								class="shrink-0 text-[0.75rem] font-semibold whitespace-nowrap {estado.tom}"
								aria-live="polite">{linha.name.trim() ? estado.texto : ''}</span
							>
							<button
								type="button"
								onclick={() => removerLinha(i)}
								disabled={linhas.length <= 1}
								class="grid size-7 shrink-0 place-items-center rounded-field text-base-content/60 hover:text-error disabled:opacity-30"
								aria-label="Remover aluno {i + 1}"
							>
								<svg class="size-[0.85rem]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<path
										d="M6 6l12 12M18 6L6 18"
										stroke="currentColor"
										stroke-width="2.4"
										stroke-linecap="round"
									/>
								</svg>
							</button>
						</div>
					{/each}
				</div>
				<button
					type="button"
					onclick={adicionarLinha}
					class="mt-2 w-full rounded-box border-[1.5px] border-dashed border-line py-3 text-[0.86rem] font-bold text-primary transition-colors hover:border-primary"
					>+ Adicionar aluno</button
				>
			{:else}
				<textarea
					name="colado"
					bind:value={colado}
					rows="8"
					placeholder={exemploLista}
					class="textarea w-full text-[0.9rem] leading-[1.75]"
					aria-label="Um aluno por linha"></textarea>
				<p class="mt-2 text-[0.78rem] text-base-content/65">
					Um por linha: <span class="font-mono">Nome · email@escola.com</span>. Só o nome também
					vale.
				</p>

				{#if forasDeLinha.length > 0}
					<!-- Nenhuma linha é descartada em silêncio: cada uma que fica de
					     fora aparece com o número e o motivo. -->
					<div
						class="mt-3 rounded-box border border-s-[3px] border-line border-s-warning bg-base-200 px-4 py-3"
					>
						<p class="mb-1.5 text-[0.84rem] font-semibold">
							{forasDeLinha.length}
							{forasDeLinha.length === 1 ? 'linha precisa' : 'linhas precisam'} de atenção
						</p>
						<ul class="grid list-none gap-1 p-0">
							{#each forasDeLinha as linha (linha.line)}
								<li class="text-[0.8rem] text-base-content/65">
									<span class="font-mono">linha {linha.line}</span> ·
									{linha.status === 'sem-nome' ? 'sem nome' : 'e-mail incompleto'} —
									<span class="font-content">{linha.raw.trim().slice(0, 48)}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/if}

			<p class="mt-4 max-w-[62ch] text-[0.8rem] leading-relaxed text-base-content/65">
				Aluno sem e-mail é permitido: ele existe na turma, aparece na chamada e nos resultados, e
				simplesmente não recebe convite — pode entrar pelo link aberto como qualquer um.
			</p>
		</div>

		<footer
			class="flex shrink-0 flex-wrap items-center gap-3 border-t border-line px-gutter-sm py-3.5"
		>
			{#if erro}
				<p class="w-full text-[0.84rem] font-semibold text-error" role="alert">{erro}</p>
			{/if}
			<span class="flex-1 text-[0.8rem] leading-snug text-base-content/65">
				{comEmail}
				{comEmail === 1 ? 'aluno vai poder receber' : 'alunos vão poder receber'} convite quando você
				enviar uma atividade.
			</span>
			<a
				href={resolve('/(studio)/turmas')}
				class="btn h-[2.9rem] motion-tap btn-neutral font-semibold no-underline">Cancelar</a
			>
			<button
				type="submit"
				disabled={nome.trim().length === 0 || criarTurma.pending > 0}
				class="btn h-[2.9rem] motion-tap gap-2.5 btn-primary font-bold"
			>
				{#if criarTurma.pending > 0}<Loading
						variant="fila"
						size={10}
						tone="current"
						label="Criando"
					/>{/if}
				{total > 0 ? `Criar turma com ${total}` : 'Criar turma'}
			</button>
		</footer>
	</form>
</div>
