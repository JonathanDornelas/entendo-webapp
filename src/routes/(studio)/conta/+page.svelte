<script lang="ts">
	// Conta e assinatura numa tela só, em duas abas. Eram duas rotas com um
	// cartão cada; a assinatura é um pedaço da conta e não merecia entrada
	// própria — no celular a barra de abas já mandava para cá.
	//
	// **As abas ficam no TOPO, não na lateral.** Uma coluna de abas ao lado da
	// barra lateral do Studio seriam duas navegações verticais lado a lado,
	// disputando o mesmo olhar.
	//
	// Regra que atravessa a aba de assinatura (billing.md, paginas.md):
	// pagamento atrasado bloqueia CRIAR e PUBLICAR, mas os links já publicados
	// continuam funcionando — o aluno nunca é afetado pela cobrança do
	// professor. Voltar do checkout NÃO significa pago: a confirmação vem do
	// webhook do provedor.
	//
	// PENDÊNCIA: o que acontece com os links já publicados ao encerrar a conta
	// não está definido — precisa de decisão antes de ir para produção. O aviso
	// dentro do cartão vermelho existe para isso não passar batido.
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { withMock } from '$lib/dev/with-mock';
	import Loading from '$lib/components/Loading.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import AvatarEditor from '$lib/components/AvatarEditor.svelte';
	import { CODIGO_PADRAO, sortearCodigo } from '$lib/avatar/montar';
	import { gravarMeuAvatar } from '../studio.remote';

	type PlanStatus = 'active' | 'trial' | 'past_due' | 'pending' | 'canceled';
	type Aba = 'dados' | 'assinatura';

	interface PageData {
		aba: Aba;
		teacher: { name: string; email: string; pendingEmail: string | null; avatar: string | null };
		plan: { status: PlanStatus; name: string; periodEnd: string | null; podePublicar: boolean };
		/** As cobranças do provedor. Vazio até o Stripe existir — nunca inventado. */
		invoices: { when: string; value: string; state: 'paga' | 'recusada' | 'pendente' }[];
	}

	const MOCK: PageData = {
		aba: 'dados' as Aba,
		teacher: {
			name: 'Ana Martins',
			email: 'ana@escola.com',
			pendingEmail: null,
			avatar: '1-1-1-1-0-0-0-0-0-1-0-0-0-0-0-1'
		},
		plan: {
			status: 'trial' as PlanStatus,
			name: 'Plano professor',
			periodEnd: null,
			podePublicar: true
		},
		invoices: []
	};

	let { data: dataProp }: { data?: Partial<PageData> } = $props();
	const data = $derived(withMock(dataProp, MOCK));

	// ── avatar ── A única ação desta tela que JÁ grava de verdade; as outras
	// (salvar dados, trocar senha, encerrar, checkout) seguem em mock até o
	// Stripe existir.
	let editorDeAvatarAberto = $state(false);
	// Só o RASCUNHO do editor. Nasce no padrão e não no avatar da conta de
	// propósito: quem semeia com o valor de verdade é `abrirEditorDeAvatar`, a
	// cada abertura — ler `data` aqui capturaria o valor inicial e ficaria
	// desatualizado depois do `invalidateAll`.
	let codigoDoAvatar = $state(CODIGO_PADRAO);
	let salvandoAvatar = $state(false);
	// Mostra o da CONTA até o editor abrir: sem isto, sortear dentro do editor e
	// fechar sem usar deixava a tela exibindo um avatar que não foi gravado.
	const avatarNaTela = $derived(
		editorDeAvatarAberto ? codigoDoAvatar : (data.teacher.avatar ?? null)
	);

	async function usarAvatar(escolhido: string) {
		salvandoAvatar = true;
		try {
			await gravarMeuAvatar(escolhido);
			await invalidateAll();
		} finally {
			salvandoAvatar = false;
		}
	}

	function abrirEditorDeAvatar() {
		codigoDoAvatar = data.teacher.avatar ?? sortearCodigo();
		editorDeAvatarAberto = true;
	}

	async function sortearEUsar() {
		const sorteado = sortearCodigo();
		codigoDoAvatar = sorteado;
		await usarAvatar(sorteado);
	}

	// O que cada estado diz. `line` é a frase de contexto; onde ela fala de
	// data, a data vem do banco e o texto se adapta quando ela não existe.
	interface Desenho {
		tag: string;
		title: string;
		sub: string;
		line: string;
		cta: string;
		/** Estilo do CTA: primário quando a ação resolve algo, neutro quando é só consulta. */
		ctaPrimario: boolean;
		/**
		 * O CTA leva à tela de planos em vez de postar o form em mock. Hoje só o
		 * trial: escolher plano é `/planos`, e isso não depende do provedor de
		 * cobrança existir. "Gerenciar cobrança", "Ver no provedor" e "Reativar"
		 * precisam do portal dele, então continuam em mock (billing.md).
		 *
		 * Um booleano e não a URL: assim o `resolve()` fica literal no `href`, que
		 * é a forma que o lint de navegação reconhece.
		 */
		ctaLevaAPlanos?: boolean;
	}
	const desenho = $derived.by((): Desenho => {
		const { status, periodEnd, name } = data.plan;
		switch (status) {
			case 'active':
				return {
					tag: 'Ativa',
					title: name,
					sub: 'tudo liberado',
					line: periodEnd
						? `Renova em ${periodEnd}. A cobrança é mensal e sai no mesmo cartão.`
						: 'A cobrança é mensal e sai no mesmo cartão.',
					cta: 'Gerenciar cobrança',
					ctaPrimario: false
				};
			case 'trial':
				return {
					tag: 'Trial',
					title: 'Período de teste',
					sub: 'você está no período de teste',
					line: 'Depois desse prazo, criar e publicar param até você assinar. O que já estiver no ar continua no ar.',
					cta: 'Assinar agora',
					ctaPrimario: true,
					ctaLevaAPlanos: true
				};
			case 'past_due':
				return {
					tag: 'Pagamento atrasado',
					title: 'A última cobrança não passou',
					sub: 'criar e publicar estão bloqueados',
					line: 'O cartão recusou a última cobrança. Resolvendo a cobrança, tudo volta na hora.',
					cta: 'Gerenciar cobrança',
					ctaPrimario: true
				};
			case 'pending':
				return {
					tag: 'Confirmando pagamento',
					title: 'Esperando o provedor confirmar',
					sub: 'ainda não é uma assinatura ativa',
					line: 'Você voltou do checkout, mas a confirmação vem do provedor de pagamento. Normalmente leva alguns minutos.',
					cta: 'Ver no provedor',
					ctaPrimario: false
				};
			case 'canceled':
				return {
					tag: 'Cancelada',
					title: periodEnd ? `Acesso até ${periodEnd}` : 'Sem nova cobrança',
					sub: 'não haverá nova cobrança',
					line: 'Até essa data nada muda. Depois dela, criar e publicar param — e os links já publicados continuam abrindo.',
					cta: 'Reativar assinatura',
					ctaPrimario: true
				};
		}
	});

	// **O que está liberado sai de `can()`**, a mesma decisão que barra o
	// botão de publicar. Os dois primeiros são sempre verdade por desenho de
	// produto: a cobrança mexe no lado do professor, nunca no do aluno.
	const liberacoes = $derived([
		{ nome: 'Links já publicados', ok: true, estado: 'sempre abrindo' },
		{ nome: 'Respostas dos alunos', ok: true, estado: 'sempre chegando' },
		{
			nome: 'Criar atividade nova',
			ok: data.plan.podePublicar,
			estado: data.plan.podePublicar ? 'liberado' : 'bloqueado'
		},
		{
			nome: 'Publicar mudanças',
			ok: data.plan.podePublicar,
			estado: data.plan.podePublicar ? 'liberado' : 'bloqueado'
		}
	]);

	const cartaoDoPlano: Record<PlanStatus, string> = {
		active: 'border-line bg-card',
		trial: 'border-line bg-card',
		past_due: 'border-error/35 bg-error/6',
		pending: 'border-warning/40 bg-warning/6',
		canceled: 'border-dashed border-line bg-card'
	};
	const pilulaDoPlano: Record<PlanStatus, string> = {
		active: 'bg-base-300 text-primary',
		trial: 'bg-base-300 text-primary',
		past_due: 'bg-error/13 text-error',
		pending: 'bg-warning/15 text-warning',
		canceled: 'bg-base-200 text-base-content/65'
	};
</script>

<svelte:head><title>Conta — entendo</title></svelte:head>

<div class="px-gutter py-gutter-sm">
	<div class="max-w-[820px]">
		<h1 class="mb-4 font-display text-title font-semibold tracking-[-0.024em]">Conta</h1>

		<nav class="mb-6 flex gap-1 border-b border-line" aria-label="Seções da conta">
			<a
				href={resolve('/(studio)/conta')}
				aria-current={data.aba === 'dados' ? 'page' : undefined}
				class="-mb-px flex items-center gap-2 border-b-2 px-3.5 py-[11px] text-sm no-underline transition-colors
				       {data.aba === 'dados'
					? 'border-primary font-bold text-primary'
					: 'border-transparent font-semibold text-base-content/65 hover:text-base-content'}"
			>
				<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" />
					<path
						d="M4 20.5c0-3.6 3.6-6 8-6s8 2.4 8 6"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
				Seus dados
			</a>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- é a própria rota resolvida mais a query da aba; a regra não enxerga a concatenação. -->
			<a
				href={resolve('/(studio)/conta') + '?aba=assinatura'}
				aria-current={data.aba === 'assinatura' ? 'page' : undefined}
				class="-mb-px flex items-center gap-2 border-b-2 px-3.5 py-[11px] text-sm no-underline transition-colors
				       {data.aba === 'assinatura'
					? 'border-primary font-bold text-primary'
					: 'border-transparent font-semibold text-base-content/65 hover:text-base-content'}"
			>
				<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<rect
						x="3"
						y="6"
						width="18"
						height="12"
						rx="2.5"
						stroke="currentColor"
						stroke-width="2"
					/>
					<path d="M3 10h18" stroke="currentColor" stroke-width="2" />
				</svg>
				Assinatura
				{#if data.plan.status === 'past_due' || data.plan.status === 'pending'}
					<!-- O ponto é um chamado, não o estado: quem está na outra aba
					     precisa saber que a assinatura pede atenção. O texto está
					     na aba. -->
					<span
						class="size-2 rounded-full {data.plan.status === 'past_due'
							? 'bg-error'
							: 'bg-warning'}"
						aria-hidden="true"
					></span>
				{/if}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</nav>

		{#if data.aba === 'dados'}
			<div class="grid gap-[26px]">
				<!-- O avatar vem PRIMEIRO porque é o que o aluno vê: ele aparece na
				     turma e no convite, ao lado do nome. Nome e e-mail vêm depois —
				     são o que o professor confere, não o que a turma encontra. -->
				<section>
					<h2 class="mb-1 font-display text-section font-semibold">Seu avatar</h2>
					<p class="mb-3.5 text-[13px] text-base-content/65">
						aparece nas turmas e no convite que o aluno recebe
					</p>
					<div
						class="flex flex-wrap items-center gap-x-4 gap-y-3.5 rounded-box border border-line bg-card p-4 lg:px-5 lg:py-[18px]"
					>
						<Avatar
							codigo={avatarNaTela}
							nome={data.teacher.name}
							size={64}
							radius="rounded-[14px]"
							class="border border-line"
						/>
						<div class="min-w-[200px] flex-1">
							<p class="mb-1 text-[13.5px] font-semibold">Escolha um dos prontos</p>
							<p class="text-[13px] leading-relaxed text-pretty text-base-content/65">
								ou monte o seu peça por peça — onze peças, nenhuma obrigatória. Ele é gravado como
								dezoito números, não como imagem.
							</p>
						</div>
						<div class="flex w-full flex-wrap gap-2 lg:w-auto">
							<button
								type="button"
								onclick={abrirEditorDeAvatar}
								disabled={salvandoAvatar}
								class="btn min-h-11 flex-1 motion-tap btn-primary text-[13.5px] font-bold lg:flex-none"
								>Montar o meu</button
							>
							<button
								type="button"
								onclick={sortearEUsar}
								disabled={salvandoAvatar}
								class="btn min-h-11 flex-1 motion-tap gap-2 btn-plain text-[13.5px] font-semibold lg:flex-none"
							>
								{#if salvandoAvatar}
									<Loading variant="fila" size={10} tone="current" label="Salvando" />
									Salvando…
								{:else}
									Sortear
								{/if}
							</button>
						</div>
					</div>
				</section>

				<section>
					<h2 class="mb-1 font-display text-section font-semibold">Seus dados</h2>
					<p class="mb-3.5 text-[13px] text-base-content/65">
						o que aparece para os alunos nos convites que você envia
					</p>
					<form method="POST" action="?/profile">
						<div class="overflow-hidden rounded-box border border-line bg-card">
							<div
								class="grid gap-2 border-b border-line px-5 py-4 lg:grid-cols-[160px_1fr] lg:items-start lg:gap-[18px]"
							>
								<label
									for="conta-nome"
									class="text-[13px] font-semibold text-base-content/65 lg:pt-[13px]">Nome</label
								>
								<input id="conta-nome" name="name" value={data.teacher.name} class="input w-full" />
							</div>
							<div
								class="grid gap-2 px-5 py-4 lg:grid-cols-[160px_1fr] lg:items-start lg:gap-[18px]"
							>
								<label
									for="conta-email"
									class="text-[13px] font-semibold text-base-content/65 lg:pt-[13px]">E-mail</label
								>
								<div class="min-w-0">
									<input
										id="conta-email"
										name="email"
										type="email"
										value={data.teacher.email}
										class="input w-full"
									/>
									{#if data.teacher.pendingEmail}
										<p
											class="mt-2.5 flex items-center gap-2 text-[12.5px] leading-normal text-warning"
										>
											<svg
												class="size-4 shrink-0"
												viewBox="0 0 24 24"
												fill="none"
												aria-hidden="true"
											>
												<path
													d="M12 4.5l8 14.5H4zM12 10v3.4M12 16.3v.1"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
											</svg>
											<span
												>Confirmação pendente em <span class="font-mono"
													>{data.teacher.pendingEmail}</span
												> — o endereço só muda quando ela for aberta.</span
											>
										</p>
									{/if}
								</div>
							</div>
						</div>
						<div class="mt-3.5 flex gap-2">
							<button type="submit" class="btn min-h-11 motion-tap btn-primary font-bold"
								>Salvar</button
							>
						</div>
					</form>
				</section>

				<section>
					<h2 class="mb-1 font-display text-section font-semibold">Senha</h2>
					<p class="mb-3.5 text-[13px] text-base-content/65">
						trocar encerra as outras sessões abertas
					</p>
					<div
						class="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-box border border-line bg-card px-5 py-4"
					>
						<span
							class="grid size-8 shrink-0 place-items-center rounded-field bg-base-300 text-primary"
						>
							<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<rect
									x="5"
									y="10.5"
									width="14"
									height="10"
									rx="2"
									stroke="currentColor"
									stroke-width="2"
								/>
								<path
									d="M8 10.5V7.5a4 4 0 018 0v3"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
								/>
							</svg>
						</span>
						<p class="min-w-[220px] flex-1 text-[13px] leading-relaxed text-base-content/65">
							Você continua conectado aqui. Qualquer outro navegador ou celular onde a conta esteja
							aberta é desconectado na hora da troca.
						</p>
						<button
							type="button"
							class="btn min-h-11 w-full motion-tap btn-neutral font-semibold lg:w-auto"
							>Trocar senha</button
						>
					</div>
				</section>

				<section>
					<h2 class="mb-1 font-display text-section font-semibold text-error">Encerrar conta</h2>
					<p class="mb-3.5 text-[13px] text-base-content/65">leia antes: isto não tem volta</p>
					<div class="rounded-box border border-error/35 bg-error/6 p-4 lg:px-5 lg:py-[18px]">
						<p class="mb-2.5 text-[13.5px] leading-relaxed">
							Encerrar apaga sua conta, seus materiais e seus rascunhos. Nada disso pode ser
							recuperado depois.
						</p>
						<div
							class="mb-3.5 flex gap-2.5 rounded-field border border-line bg-base-100 px-3.5 py-3"
						>
							<svg
								class="mt-0.5 size-4 shrink-0 text-base-content/65"
								viewBox="0 0 24 24"
								fill="none"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
								<path
									d="M12 11v5.5M12 7.5h.01"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
								/>
							</svg>
							<p class="text-[12.5px] leading-relaxed text-base-content/65">
								O que acontece com os links que você já publicou ainda não foi decidido. Antes de
								encerrar, esta tela vai dizer exatamente o que ocorre com eles — hoje ela não sabe,
								e por isso não afirma.
							</p>
						</div>
						<button
							type="button"
							class="btn min-h-11 w-full motion-tap btn-outline-error font-bold lg:w-auto"
						>
							Encerrar minha conta
						</button>
					</div>
				</section>
			</div>
		{:else}
			<div class="grid gap-[26px]">
				<section>
					<h2 class="mb-1 font-display text-section font-semibold">Assinatura</h2>
					<p class="mb-3.5 text-[13px] text-base-content/65">{desenho.sub}</p>
					<div class="overflow-hidden rounded-box border {cartaoDoPlano[data.plan.status]}">
						<div class="p-4 lg:px-6 lg:py-[22px]">
							<div class="flex flex-wrap items-start gap-x-[18px] gap-y-3.5">
								<span
									class="grid size-[46px] shrink-0 place-items-center rounded-[13px] {pilulaDoPlano[
										data.plan.status
									]}"
								>
									{#if data.plan.status === 'pending'}
										<Loading
											variant="traco"
											size={24}
											tone="current"
											label="Confirmando o pagamento"
										/>
									{:else if data.plan.status === 'past_due'}
										<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<path
												d="M12 4.5l8 14.5H4z"
												stroke="currentColor"
												stroke-width="2"
												stroke-linejoin="round"
											/>
											<path
												d="M12 10v3.4M12 16.3v.1"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
											/>
										</svg>
									{:else if data.plan.status === 'canceled'}
										<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2" />
											<path
												d="M6 6l12 12"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
											/>
										</svg>
									{:else if data.plan.status === 'trial'}
										<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2" />
											<path
												d="M12 7.5V12l3 2"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
											/>
										</svg>
									{:else}
										<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2" />
											<path
												d="M8.5 12.2l2.4 2.4 4.6-4.9"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									{/if}
								</span>
								<div class="min-w-0 flex-1">
									<span
										class="mb-2.5 inline-flex items-center gap-[7px] rounded-full px-[11px] py-[5px] text-xs font-bold {pilulaDoPlano[
											data.plan.status
										]}"
									>
										{desenho.tag}
									</span>
									<p class="mb-1.5 font-display text-[22px] font-semibold tracking-[-0.022em]">
										{desenho.title}
									</p>
									<p class="max-w-[62ch] text-[13.5px] leading-relaxed text-base-content/65">
										{desenho.line}
									</p>
								</div>
								{#if desenho.ctaLevaAPlanos}
									<!-- Escolher plano é uma tela nossa: não depende do provedor. -->
									<a
										href={resolve('/(site)/planos')}
										class="btn min-h-11 w-full motion-tap btn-primary font-bold no-underline lg:w-auto"
										>{desenho.cta}</a
									>
								{:else}
									<!-- Ações ainda em mock: o checkout e o portal vêm do Stripe
									     (billing.md), que não está plugado. -->
									<form method="POST" action="?/portal" class="w-full lg:w-auto">
										<button
											type="submit"
											class="btn min-h-11 w-full motion-tap font-bold {desenho.ctaPrimario
												? data.plan.status === 'past_due'
													? 'btn-error'
													: 'btn-primary'
												: 'btn-outline'}"
										>
											{desenho.cta}
										</button>
									</form>
								{/if}
							</div>

							{#if data.plan.status === 'pending'}
								<p class="mt-3.5 text-[12.5px] leading-relaxed text-base-content/65">
									Voltar do checkout não quer dizer que o pagamento passou. Quem confirma é o
									provedor, e pode levar alguns minutos. Enquanto isso a conta segue no plano
									anterior — se ela mudar, esta tela muda sozinha.
								</p>
							{:else if data.plan.status === 'trial'}
								<!-- Duração do trial é pendência de produto (CLAUDE.md): a linha
								     fica reservada em vez de inventar um número de dias. -->
								<p class="mt-3.5 text-[12.5px] leading-relaxed text-base-content/65">
									Duração do trial e se ele pede cartão ainda não foram definidos — esta linha fica
									reservada para essa informação.
								</p>
							{/if}
						</div>

						{#if data.plan.status === 'past_due'}
							<div class="flex gap-3 border-t border-error/35 bg-base-100 px-4 py-4 lg:px-6">
								<svg
									class="mt-0.5 size-[18px] shrink-0 text-success"
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
								<div class="min-w-0">
									<p class="mb-1 text-[13.5px] font-bold">Seus alunos não são afetados</p>
									<p class="text-[12.5px] leading-relaxed text-base-content/65">
										Os links já publicados continuam abrindo e recebendo respostas normalmente. O
										que fica bloqueado é criar atividade nova e publicar mudanças, até a cobrança
										ser resolvida.
									</p>
								</div>
							</div>
						{/if}
					</div>
				</section>

				<section>
					<h2 class="mb-1 font-display text-section font-semibold">O que está liberado agora</h2>
					<p class="mb-3.5 text-[13px] text-base-content/65">
						a cobrança mexe no seu lado, nunca no do aluno
					</p>
					<ul class="overflow-hidden rounded-box border border-line bg-card">
						{#each liberacoes as item (item.nome)}
							<li
								class="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 lg:px-5"
							>
								<span
									class="grid size-7 shrink-0 place-items-center rounded-[9px] {item.ok
										? 'bg-success/13 text-success'
										: 'bg-error/13 text-error'}"
								>
									{#if item.ok}
										<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<path
												d="M5 12.5l4.5 4.5L19 7"
												stroke="currentColor"
												stroke-width="2.4"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									{:else}
										<svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<path
												d="M6 6l12 12M18 6L6 18"
												stroke="currentColor"
												stroke-width="2.4"
												stroke-linecap="round"
											/>
										</svg>
									{/if}
								</span>
								<span class="min-w-0 flex-1 text-sm font-semibold">{item.nome}</span>
								<!-- Texto E ícone: a cor sozinha não diz liberado/bloqueado. -->
								<span
									class="text-[12.5px] font-bold whitespace-nowrap {item.ok
										? 'text-success'
										: 'text-error'}">{item.estado}</span
								>
							</li>
						{/each}
					</ul>
				</section>

				<section>
					<h2 class="mb-1 font-display text-section font-semibold">Cobranças</h2>
					<p class="mb-3.5 text-[13px] text-base-content/65">
						recibos ficam com o provedor de pagamento
					</p>
					<!-- Sem provedor plugado não há fatura para listar — e inventar uma
					     lista aqui seria mostrar cobrança que não aconteceu. A lista existe
					     para quando ele existir. -->
					<div class="overflow-hidden rounded-[14px] border border-line">
						{#each data.invoices as cobranca, i (i)}
							<div
								class="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line px-3.5 py-[13px] last:border-0 lg:px-5 lg:py-3.5"
							>
								<span class="min-w-[140px] flex-1 text-sm font-semibold">{cobranca.when}</span>
								<span class="font-mono text-[13.5px]">{cobranca.value}</span>
								<span
									class="rounded-full px-[11px] py-[5px] text-xs font-bold {cobranca.state ===
									'paga'
										? 'bg-success/12 text-success'
										: cobranca.state === 'recusada'
											? 'bg-error/12 text-error'
											: 'bg-warning/14 text-warning'}"
									>{cobranca.state === 'paga'
										? 'Paga'
										: cobranca.state === 'recusada'
											? 'Recusada'
											: 'Pendente'}</span
								>
							</div>
						{:else}
							<p class="px-4 py-4 text-[13.5px] leading-relaxed text-base-content/65 lg:px-5">
								{#if data.plan.status === 'trial'}
									Nenhuma cobrança ainda: você está no período de teste.
								{:else}
									Cartão, faturas e recibos ficam no portal do provedor — é para lá que "{desenho.cta}"
									leva.
								{/if}
							</p>
						{/each}
					</div>
				</section>
			</div>
		{/if}
	</div>
</div>

<AvatarEditor bind:codigo={codigoDoAvatar} bind:aberto={editorDeAvatarAberto} onusar={usarAvatar} />
