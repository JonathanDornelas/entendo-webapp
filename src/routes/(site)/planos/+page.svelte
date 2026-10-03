<script lang="ts">
	// Planos e preços. Página pública de comparação E destino de quem bateu numa
	// porta fechada (`?motivo=`) — o loader explica os dois papéis.
	//
	// **Chegando por um bloqueio, a primeira coisa é o motivo, não a tabela.**
	// Cair numa página de preços sem entender o que se pediu tem uma leitura só,
	// e é a pior: "quebrou e me jogou na cobrança". O aviso diz também o que
	// NÃO se perdeu — o rascunho continua salvo, os links continuam no ar.
	import { resolve } from '$app/paths';
	import PlanosTabela from '$lib/components/PlanosTabela.svelte';
	import SiteHero from '$lib/components/SiteHero.svelte';
	import { ledePadrao, tituloPadrao, type PlanoId } from '$lib/content/planos';
	import type { MotivoDoBloqueio } from './+page.server';

	interface PageData {
		motivo: MotivoDoBloqueio | null;
		motivos: Record<MotivoDoBloqueio, { titulo: string; texto: string }>;
		planoAtual: PlanoId | null;
		jaAssinante: boolean;
		logado: boolean;
	}

	let { data }: { data: PageData } = $props();

	const aviso = $derived(data.motivo ? data.motivos[data.motivo] : null);
</script>

<svelte:head>
	<title>Planos e preços — entendo</title>
	<meta
		name="description"
		content="Um preço por professor, sem cobrar do aluno. Compare o que muda entre os planos do entendo."
	/>
</svelte:head>

<SiteHero eyebrow="Planos e preços" title={tituloPadrao} lede={ledePadrao} />

<main class="mx-auto w-full max-w-[1100px] px-gutter py-gutter">
	{#if aviso}
		<!-- O motivo vem ANTES de tudo, e diz o que continua de pé. -->
		<div
			class="mb-8 flex flex-wrap gap-x-4 gap-y-3 rounded-box border border-s-[3px] border-line border-s-primary bg-base-200 px-4 py-4 lg:px-5 lg:py-[18px]"
			role="status"
		>
			<svg
				class="mt-0.5 size-[22px] shrink-0 self-start text-primary"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
				<rect x="5" y="10.5" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" />
				<path
					d="M8 10.5V7.5a4 4 0 018 0v3"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
			<div class="min-w-[240px] flex-1">
				<h2 class="mb-1.5 font-display text-[17px] font-semibold tracking-[-0.018em] text-pretty">
					{aviso.titulo}
				</h2>
				<p class="max-w-[76ch] text-[13.5px] leading-relaxed text-pretty text-base-content/65">
					{aviso.texto}
				</p>

				{#if data.jaAssinante}
					<!-- Já pode publicar e ainda assim caiu aqui: não é hora de vender
					     nada. O caminho é voltar ao painel. -->
					<p class="mt-3 text-[13px] leading-relaxed text-pretty">
						Sua assinatura está ativa — este bloqueio não é de cobrança.
						<a href={resolve('/(studio)/atividades')} class="font-bold">Voltar para as atividades</a
						>
						ou
						<a href={resolve('/(site)/contato')} class="font-bold">falar com a gente</a>.
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- O cabeçalho da tabela seria o segundo título igual na mesma tela: o
	     `SiteHero` acima já diz o mesmo. Só o seletor de ciclo faz falta, e ele
	     vem dentro do cabeçalho — por isso ele fica, e o título não se repete. -->
	<PlanosTabela planoAtual={data.planoAtual} titulo="Escolha o seu ciclo" lede="" />

	<!-- Quem não tem conta ainda: o caminho de sempre, que não passa por preço
	     nenhum. Responder nunca exigiu conta, e criar começa de graça. -->
	{#if !data.logado}
		<div
			class="mt-[18px] rounded-[14px] border border-dashed border-line px-5 py-[18px] text-center"
		>
			<p class="mb-1.5 text-sm font-bold">Ainda dá para experimentar sem decidir nada</p>
			<p
				class="mx-auto mb-3.5 max-w-[62ch] text-[13px] leading-relaxed text-pretty text-base-content/65"
			>
				O plano Livre não pede cartão. Você monta uma atividade, manda o link para a turma e vê o
				resultado — e decide depois.
			</p>
			<a
				href={resolve('/(auth)/cadastro')}
				class="btn min-h-11 motion-tap btn-primary font-bold no-underline">Criar minha conta</a
			>
		</div>
	{/if}

	<p class="mt-6 text-center text-[12.5px] leading-relaxed text-pretty text-base-content/65">
		Dúvida sobre qual plano serve para a sua escola?
		<a href={resolve('/(site)/contato')} class="font-semibold">Fale com a gente</a> — a gente responde
		com uma proposta pelo número de professores.
	</p>
</main>
