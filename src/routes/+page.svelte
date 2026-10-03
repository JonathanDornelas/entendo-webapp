<script lang="ts">
	/**
	 * Home — entendo. Tema, tipografia e movimento vêm de src/app.css.
	 * Regras: .claude/rules/design-system.md + home.md
	 */
	import Button from '$lib/components/Button.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import PlanosTabela from '$lib/components/PlanosTabela.svelte';
	import Recorder from '$lib/components/Recorder.svelte';
	import { reveal } from '$lib/actions/reveal';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { resolve } from '$app/paths';

	const demos = ['listening', 'tolerant', 'assemble', 'speak'] as const;
	type Demo = (typeof demos)[number];
	const demoLabels: Record<Demo, string> = {
		listening: 'Listening',
		tolerant: 'Escrita',
		assemble: 'Montar',
		speak: 'Fala'
	};

	let demo = $state(0);
	let manual = $state(false);
	let speakRecording = $state(true);

	// O tema é do produto inteiro, não desta página: quem guarda a escolha,
	// sincroniza e alterna é ThemeToggle + $lib/client/theme.

	$effect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const t = setInterval(() => {
			if (!manual) demo = (demo + 1) % demos.length;
		}, 4600);
		return () => clearInterval(t);
	});

	function pick(i: number) {
		demo = i;
		manual = true;
	}

	type Skill = {
		name: string;
		tone: string;
		body: string;
		icon: 'headphones' | 'mic' | 'book' | 'pencil';
	};
	const skills: Skill[] = [
		{
			name: 'Listening',
			tone: 'text-accent',
			body: 'Áudio seu ou gerado por voz sintética. Velocidade alternável, repetição livre, nunca autoplay.',
			icon: 'headphones'
		},
		{
			name: 'Speaking',
			tone: 'text-accent',
			body: 'O aluno grava e recebe uma nota de pronúncia. Microfone negado ou ambiente barulhento não travam nada: pular está sempre visível.',
			icon: 'mic'
		},
		{
			name: 'Reading',
			tone: 'text-primary',
			body: 'Texto e perguntas na mesma tela, com leitura em voz alta opcional. O aluno não precisa rolar para lembrar o que leu.',
			icon: 'book'
		},
		{
			name: 'Writing',
			tone: 'text-primary',
			body: 'De completar a frase com tolerância a acento e caixa até resposta longa, que fica na sua fila para correção humana.',
			icon: 'pencil'
		}
	];

	const steps = [
		{
			n: '1',
			title: 'Cole seu material',
			body: 'Um texto, uma lista de vocabulário, um diálogo. O gerador propõe os itens e você ajusta o que quiser, item por item.'
		},
		{
			n: '2',
			title: 'Publique e copie o link',
			body: 'O link é um só e não muda. Se você editar a atividade depois, quem já respondeu continua com o que respondeu.'
		},
		{
			n: '3',
			title: 'Leia os resultados',
			body: 'Por aluno e por item. Os itens que a turma errou mais aparecem primeiro — é o que decide a próxima aula.'
		}
	];

	const states = [
		{
			state: 'correct',
			border: 'border-s-success',
			tone: 'text-success',
			label: 'Correto',
			answer: 'has been working'
		},
		{
			state: 'partial',
			border: 'border-s-warning',
			tone: 'text-warning',
			label: 'Parcial — faltou o final',
			answer: 'has been workin'
		},
		{
			state: 'incorrect',
			border: 'border-s-error',
			tone: 'text-error',
			label: 'Incorreto',
			answer: 'is working'
		}
	] as const;

	const languages = [
		'English',
		'日本語',
		'Español',
		'العربية',
		'中文',
		'Français',
		'עברית',
		'ไทย',
		'Deutsch',
		'한국어',
		'Italiano',
		'Português'
	];
</script>

<svelte:head>
	<title>entendo — exercícios de idioma publicados em um link</title>
	<meta
		name="description"
		content="Monte exercícios de listening, speaking, reading e writing, publique e mande o link. O aluno responde sem criar conta."
	/>
</svelte:head>

<SiteHeader>
	{#snippet extra()}
		<ThemeToggle />
	{/snippet}
</SiteHeader>

<div class="mx-auto max-w-[1200px] px-7">
	<!-- 1 · Hero -->
	<section class="grid items-center gap-14 py-[84px] pb-[72px] lg:grid-cols-[1.08fr_0.92fr]">
		<div class="relative z-2">
			<p
				class="mb-6 inline-flex animate-[en-fade-up_600ms_var(--ease-out-soft)_both] rounded-full
				       bg-base-300 px-3.5 py-2 text-[12.5px] font-bold tracking-[0.1em] text-primary uppercase"
			>
				Para professores de idiomas
			</p>
			<h1
				class="mb-6 animate-[en-fade-up_640ms_var(--ease-out-soft)_80ms_both] font-display text-[62px]
				       leading-[0.99] font-extrabold tracking-[-0.035em] text-pretty"
			>
				Exercícios que treinam as quatro habilidades, publicados em um link.
			</h1>
			<p
				class="mb-[30px] max-w-[50ch] animate-[en-fade-up_640ms_var(--ease-out-soft)_160ms_both]
				       text-lg leading-relaxed text-pretty text-base-content/65"
			>
				Você monta a atividade no Studio, publica e manda o link. O aluno abre, digita o nome e
				responde — sem criar conta, sem instalar nada. A correção acontece no servidor e os
				resultados chegam para você.
			</p>
			<div
				class="mb-6 flex animate-[en-fade-up_640ms_var(--ease-out-soft)_240ms_both] flex-wrap gap-3"
			>
				<Button
					href={resolve('/(studio)/atividades/nova')}
					size="lg"
					class="text-[17px] no-underline shadow-[0_12px_30px_-16px_color-mix(in_oklab,var(--color-primary)_65%,transparent)]"
				>
					Criar uma atividade
				</Button>
				<Button
					href="/exemplo"
					variant="outline"
					size="lg"
					class="gap-2.5 text-[17px] no-underline"
				>
					<svg class="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M8 5.5l10 6.5-10 6.5z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/>
					</svg>
					Abrir um exemplo
				</Button>
			</div>
			<p
				class="flex animate-[en-fade-up_640ms_var(--ease-out-soft)_320ms_both] items-center gap-2.5
				       text-sm text-base-content/65"
			>
				<svg
					class="size-[17px] shrink-0 text-success"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
				>
					<path
						d="M4 12.5l5 5L20 6.5"
						stroke="currentColor"
						stroke-width="2.4"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				O aluno responde sem conta. Você mantém a turma inteira em um link.
			</p>
		</div>

		<!-- celular ao vivo -->
		<div class="relative flex min-h-[620px] items-center justify-center">
			<div
				aria-hidden="true"
				class="pointer-events-none absolute -inset-x-[18%] -inset-y-[10%] overflow-hidden"
			>
				<div
					class="absolute top-[8%] left-[6%] size-[190px] animate-[en-float-a_17s_ease-in-out_infinite]
					       rounded-full bg-primary/30 blur-sm"
				></div>
				<div
					class="absolute top-[4%] right-[4%] size-30 animate-[en-float-c_21s_ease-in-out_infinite]
					       rounded-[40px] border-[1.5px] border-accent/45"
				></div>
				<div
					class="absolute bottom-[12%] left-0 h-[92px] w-[104px] animate-[en-drift-spin_26s_ease-in-out_infinite]
					       bg-primary/25 [clip-path:polygon(50%_0%,100%_100%,0%_100%)]"
				></div>
				<div
					class="absolute right-[6%] bottom-[8%] size-[84px] animate-[en-float-b_15s_ease-in-out_infinite]
					       bg-accent/20 [clip-path:polygon(25%_3%,75%_3%,100%_50%,75%_97%,25%_97%,0%_50%)]"
				></div>
				<div
					class="absolute right-[20%] bottom-[30%] size-[62px] animate-[en-spin_14s_linear_infinite]
					       rounded-full border-2 border-accent/40 border-e-transparent border-t-transparent"
				></div>
				<div
					class="absolute top-[52%] left-[14%] size-[26px] animate-[en-breathe_6s_ease-in-out_infinite]
					       rounded-full bg-warning/35"
				></div>
			</div>

			<div
				class="relative z-1 flex h-[600px] w-[344px] animate-[en-fade-up_800ms_var(--ease-out-soft)_200ms_both]
				       flex-col overflow-hidden rounded-[40px] border-[9px] border-bezel bg-base-100
				       shadow-[0_30px_70px_-34px_rgb(var(--shadow)/0.55)]"
			>
				<div class="flex items-center gap-3 p-4 pb-3">
					<span
						class="grid size-[34px] shrink-0 place-items-center rounded-full bg-base-200 text-[11px] font-bold text-base-content/60"
					>
						JP
					</span>
					<div class="h-2.5 flex-1 overflow-hidden rounded-full bg-base-300">
						<div
							class="h-full origin-left rounded-full bg-primary"
							style="transform: scaleX({(demo + 1) / 8})"
						></div>
					</div>
					<span class="font-mono text-xs text-base-content/60">{demo + 1}/8</span>
				</div>

				<div class="flex flex-1 flex-col px-5 py-[18px]">
					{#if demos[demo] === 'listening'}
						<div class="flex flex-1 animate-[en-fade-up_420ms_var(--ease-out-soft)_both] flex-col">
							<p
								class="mb-3 flex items-center gap-2 text-[11.5px] font-bold tracking-[0.08em] text-accent uppercase"
							>
								<svg class="size-[15px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<path
										d="M4 12.5V11a8 8 0 1116 0v1.5"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
									<rect
										x="2.5"
										y="12.5"
										width="4.5"
										height="7"
										rx="2"
										stroke="currentColor"
										stroke-width="2"
									/>
									<rect
										x="17"
										y="12.5"
										width="4.5"
										height="7"
										rx="2"
										stroke="currentColor"
										stroke-width="2"
									/>
								</svg>
								Listening
							</p>
							<h3
								class="mb-[18px] font-display text-[25px] leading-tight font-semibold tracking-[-0.02em]"
							>
								Escute e escolha o que você ouviu
							</h3>
							<div class="mb-[18px]">
								<AudioPlayer src="/demo/silence.wav" playing={true} />
							</div>
							<div class="grid gap-2.5" data-content-lang="en" dir="ltr">
								<p
									class="rounded-box border-[1.5px] border-b-[3px] border-line bg-base-100 px-4 py-3.5 text-[17px]"
								>
									She has been working here.
								</p>
								<p
									class="rounded-box border-[1.5px] border-b-[3px] border-primary bg-base-300 px-4 py-3.5 text-[17px] text-primary"
								>
									She is working here.
								</p>
								<p
									class="rounded-box border-[1.5px] border-b-[3px] border-line bg-base-100 px-4 py-3.5 text-[17px]"
								>
									She worked here.
								</p>
							</div>
						</div>
					{:else if demos[demo] === 'tolerant'}
						<div class="flex flex-1 animate-[en-fade-up_420ms_var(--ease-out-soft)_both] flex-col">
							<p class="mb-3 text-[11.5px] font-bold tracking-[0.08em] text-primary uppercase">
								Writing · tolerant
							</p>
							<h3
								class="mb-4 font-display text-[25px] leading-tight font-semibold tracking-[-0.02em]"
							>
								Complete a frase
							</h3>
							<p
								class="mb-4 font-content text-[19px] leading-relaxed"
								data-content-lang="en"
								dir="ltr"
							>
								She ______ here since 2019.
							</p>
							<p
								class="rounded-box border-[1.5px] border-warning bg-base-100 px-4 py-3.5 font-content text-[18px]"
								data-content-lang="en"
								dir="ltr"
							>
								has been workin<span
									class="ms-0.5 inline-block h-[18px] w-0.5 translate-y-0.5 caret-blink bg-primary"
								></span>
							</p>
							<div
								class="mt-3.5 flex gap-2.5 rounded-field border-s-[3px] border-warning bg-base-200 px-4 py-3"
							>
								<svg
									class="size-[19px] shrink-0 text-warning"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
									<path d="M12 3a9 9 0 010 18z" fill="currentColor" />
								</svg>
								<p class="text-[13.5px] leading-snug">
									<strong>Quase.</strong> Faltou o <span class="font-content">g</span>:
									<span class="font-content font-semibold">has been working</span>.
								</p>
							</div>
							<p class="mt-3.5 text-[12.5px] leading-relaxed text-base-content/60">
								Acento e caixa são ignorados. Uma letra a menos vira parcial, não zero.
							</p>
						</div>
					{:else if demos[demo] === 'assemble'}
						<div class="flex flex-1 animate-[en-fade-up_420ms_var(--ease-out-soft)_both] flex-col">
							<p class="mb-3 text-[11.5px] font-bold tracking-[0.08em] text-primary uppercase">
								Assemble
							</p>
							<h3
								class="mb-2 font-display text-[25px] leading-tight font-semibold tracking-[-0.02em]"
							>
								Monte a frase
							</h3>
							<p class="mb-4 text-[13.5px] text-base-content/60">Ela trabalha aqui desde 2019.</p>
							<div
								class="mb-[18px] flex min-h-[104px] flex-wrap content-start gap-2 rounded-box
								       border-[1.5px] border-dashed border-line bg-base-200 p-3"
								data-content-lang="en"
								dir="ltr"
							>
								<span
									class="rounded-field border border-b-[3px] border-line bg-base-100 px-3 py-2.5 font-content text-base"
								>
									She
								</span>
								<span
									class="rounded-field border border-b-[3px] border-line bg-base-100 px-3 py-2.5 font-content text-base"
								>
									has
								</span>
								<span
									class="rounded-field border-[1.5px] border-b-[3px] border-primary bg-base-300 px-[11px] py-2 font-content text-base text-primary"
								>
									been
								</span>
							</div>
							<div class="flex flex-wrap gap-2" data-content-lang="en" dir="ltr">
								{#each ['working', 'since', 'here', '2019'] as t (t)}
									<span
										class="rounded-field border border-b-[3px] border-line bg-base-100 px-3 py-2.5 font-content text-base"
									>
										{t}
									</span>
								{/each}
							</div>
							<div
								class="mt-[18px] flex items-center gap-2.5 rounded-field border border-line bg-base-200 px-3.5 py-3"
							>
								<svg
									class="size-[17px] shrink-0 text-base-content/60"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<rect
										x="2.5"
										y="5.5"
										width="19"
										height="13"
										rx="3"
										stroke="currentColor"
										stroke-width="2"
									/>
									<path
										d="M8 14.5h8M7 10h.01M11 10h.01M15 10h.01"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
								</svg>
								<p class="text-[12.5px] leading-relaxed text-base-content/60">
									Funciona por toque e por teclado.
								</p>
							</div>
						</div>
					{:else}
						<div class="flex flex-1 animate-[en-fade-up_420ms_var(--ease-out-soft)_both] flex-col">
							<p class="mb-3 text-[11.5px] font-bold tracking-[0.08em] text-accent uppercase">
								Speaking · ASR
							</p>
							<h3
								class="mb-3.5 font-display text-[25px] leading-tight font-semibold tracking-[-0.02em]"
							>
								Fale a frase
							</h3>
							<p
								class="mb-1.5 font-content text-xl leading-normal"
								data-content-lang="en"
								dir="ltr"
							>
								She has been working here since 2019.
							</p>
							<p class="font-mono text-[12.5px] text-base-content/60">/ʃi hæz bɪn ˈwɜːkɪŋ/</p>
							<div class="mt-auto flex flex-col items-center gap-4">
								<Recorder
									recording={speakRecording}
									ontoggle={() => (speakRecording = !speakRecording)}
								/>
							</div>
						</div>
					{/if}
				</div>

				<div class="flex gap-2.5 border-t border-line px-5 pt-3 pb-5">
					<span
						class="flex min-h-[50px] items-center rounded-box border border-line bg-base-200 px-4 text-sm font-semibold text-base-content/60"
					>
						Pular
					</span>
					<span
						class="flex min-h-[50px] flex-1 items-center justify-center rounded-box bg-primary text-base font-bold text-primary-content"
					>
						Verificar
					</span>
				</div>
			</div>

			<div
				class="absolute -bottom-2 left-1/2 z-2 flex -translate-x-1/2 gap-2 rounded-full border
				       border-line bg-base-100 p-2 shadow-[0_12px_30px_-18px_rgb(var(--shadow)/0.4)]"
			>
				{#each demos as d, i (d)}
					<button
						type="button"
						class="rounded-full px-3.5 py-2.5 text-[12.5px] font-bold transition-colors"
						class:bg-base-300={demo === i}
						class:text-primary={demo === i}
						class:text-base-content={demo !== i}
						aria-pressed={demo === i}
						onclick={() => pick(i)}
					>
						{demoLabels[d]}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- 2 · Quatro habilidades -->
	<section id="habilidades" class="pt-[72px]">
		<div class="mb-9 max-w-[62ch] reveal-row" use:reveal>
			<p class="mb-4 text-xs font-bold tracking-[0.14em] text-primary uppercase">
				Quatro habilidades
			</p>
			<h2
				class="mb-3.5 font-display text-[40px] leading-[1.08] font-semibold tracking-[-0.025em] text-pretty"
			>
				Múltipla escolha não ensina a falar.
			</h2>
			<p class="text-[17px] leading-relaxed text-base-content/65">
				Cada tipo de interação existe para uma habilidade específica. Você escolhe quais entram na
				atividade e em que ordem.
			</p>
		</div>

		<div class="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
			{#each skills as skill, i (skill.name)}
				<article
					class="reveal-row rounded-box border border-line bg-base-100 p-6 transition-all duration-200
					       hover:-translate-y-[5px] hover:border-primary
					       hover:shadow-[0_22px_44px_-30px_color-mix(in_oklab,var(--color-primary)_60%,transparent)]"
					use:reveal={{ delay: i * 90 }}
				>
					<span
						class="mb-[18px] grid size-[46px] place-items-center rounded-box bg-base-300 {skill.tone}"
					>
						{#if skill.icon === 'headphones'}
							<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M4 12.5V11a8 8 0 1116 0v1.5"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
								/>
								<rect
									x="2.5"
									y="12.5"
									width="4.5"
									height="7"
									rx="2"
									stroke="currentColor"
									stroke-width="2"
								/>
								<rect
									x="17"
									y="12.5"
									width="4.5"
									height="7"
									rx="2"
									stroke="currentColor"
									stroke-width="2"
								/>
							</svg>
						{:else if skill.icon === 'mic'}
							<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<rect
									x="9"
									y="2.5"
									width="6"
									height="11"
									rx="3"
									stroke="currentColor"
									stroke-width="2"
								/>
								<path
									d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
								/>
							</svg>
						{:else if skill.icon === 'book'}
							<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M3 5.5h6a3 3 0 013 3v10a2.5 2.5 0 00-2.5-2.5H3zM21 5.5h-6a3 3 0 00-3 3v10a2.5 2.5 0 012.5-2.5H21z"
									stroke="currentColor"
									stroke-width="2"
									stroke-linejoin="round"
								/>
							</svg>
						{:else}
							<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M4 20h4l11-11a2.83 2.83 0 10-4-4L4 16z"
									stroke="currentColor"
									stroke-width="2"
									stroke-linejoin="round"
								/>
							</svg>
						{/if}
					</span>
					<h3 class="mb-2 font-display text-[21px] font-semibold">{skill.name}</h3>
					<p class="text-sm leading-relaxed text-base-content/65">{skill.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<!-- 3 · O Player -->
	<section id="player" class="pt-[72px]">
		<div
			class="relative grid reveal-row items-center gap-8 overflow-hidden rounded-[20px]
			       bg-panel p-11 lg:grid-cols-[1fr_260px]"
			use:reveal
		>
			<div class="relative z-1">
				<p class="mb-4 text-xs font-bold tracking-[0.14em] text-panel-dim uppercase">O Player</p>
				<h2
					class="mb-4 max-w-[30ch] font-display text-[38px] leading-[1.1] font-semibold tracking-[-0.025em]
					       text-pretty text-panel-content"
				>
					Feito para o celular que o aluno tem, na rede que ele tem.
				</h2>
				<p
					class="mb-6 max-w-[54ch] text-[16.5px] leading-relaxed text-[color-mix(in_oklab,var(--color-panel-content)_82%,var(--color-panel))]"
				>
					Uma pergunta por tela, alvo de toque grande, nada de tela de carregamento eterna. Toda
					interação funciona pelo teclado, e o resultado de cada item é anunciado para leitor de
					tela.
				</p>
				<ul class="flex list-none flex-wrap gap-2.5 p-0">
					{#each ['Sem instalar app', 'Sem conta do aluno', 'Teclado e leitor de tela', 'Retomada onde parou'] as chip (chip)}
						<li
							class="rounded-full border border-panel-line px-3.5 py-2 text-[13px] font-semibold text-panel-content"
						>
							{chip}
						</li>
					{/each}
				</ul>
			</div>
			<div aria-hidden="true" class="relative h-[200px]">
				<div
					class="absolute end-0 top-0 size-[150px] animate-[en-float-a_16s_ease-in-out_infinite]
					       rounded-full bg-primary/45 blur-[2px]"
				></div>
				<div
					class="absolute start-[6%] bottom-[4%] h-[84px] w-[96px] animate-[en-drift-spin_24s_ease-in-out_infinite]
					       bg-accent/25 [clip-path:polygon(50%_0%,100%_100%,0%_100%)]"
				></div>
				<div
					class="absolute end-[22%] bottom-[12%] size-[58px] animate-[en-spin_13s_linear_infinite]
					       rounded-full border-2 border-accent/50 border-e-transparent border-t-transparent"
				></div>
				<div
					class="absolute start-[44%] top-[8%] size-10 animate-[en-breathe_7s_ease-in-out_infinite] rounded-full bg-warning/40"
				></div>
			</div>
		</div>
	</section>

	<!-- 4 · Correção -->
	<section id="correcao" class="pt-[72px]">
		<div class="grid items-center gap-11 lg:grid-cols-[0.92fr_1.08fr]">
			<div class="reveal-row" use:reveal>
				<p class="mb-4 text-xs font-bold tracking-[0.14em] text-primary uppercase">Correção</p>
				<h2
					class="mb-4 font-display text-[40px] leading-[1.08] font-semibold tracking-[-0.025em] text-pretty"
				>
					Entre certo e errado existe o quase.
				</h2>
				<p class="mb-4 text-[17px] leading-relaxed text-base-content/65">
					Uma letra faltando não é a mesma coisa que não saber a resposta. O parcial é um estado
					próprio: o aluno vê o que faltou, e você vê no relatório quantos chegaram perto.
				</p>
				<p class="text-[17px] leading-relaxed text-base-content/65">
					Certo e errado nunca aparecem só por cor — sempre com ícone e texto. O gabarito fica no
					servidor e só é revelado se você permitir.
				</p>
			</div>

			<div class="grid gap-3">
				{#each states as s, i (s.state)}
					<div
						class="flex reveal-row items-center gap-4 rounded-box border border-s-4 border-line {s.border}
						       bg-base-100 px-[22px] py-5 transition-transform duration-200 hover:translate-x-1"
						use:reveal={{ delay: 80 + i * 110 }}
					>
						<span class="shrink-0 {s.tone}">
							{#if s.state === 'correct'}
								<svg class="size-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<circle
										cx="12"
										cy="12"
										r="9"
										stroke="currentColor"
										stroke-width="2"
										opacity="0.4"
									/>
									<path
										d="M7.5 12.5l3 3 6-6.5"
										stroke="currentColor"
										stroke-width="2.4"
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-dasharray="34"
										class="animate-[en-draw_1.4s_var(--ease-out-soft)_infinite_alternate]"
									/>
								</svg>
							{:else if s.state === 'partial'}
								<svg class="size-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
									<path d="M12 3a9 9 0 010 18z" fill="currentColor" />
								</svg>
							{:else}
								<svg class="size-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
									<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
									<path
										d="M8.5 8.5l7 7M15.5 8.5l-7 7"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
								</svg>
							{/if}
						</span>
						<div>
							<p class="mb-1 text-base font-bold">{s.label}</p>
							<p
								class="font-content text-[15px] text-base-content/65"
								data-content-lang="en"
								dir="ltr"
							>
								{s.answer}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- 5 · Do rascunho ao link -->
	<section class="pt-[72px]">
		<div class="mb-9 max-w-[62ch] reveal-row" use:reveal>
			<p class="mb-4 text-xs font-bold tracking-[0.14em] text-primary uppercase">
				Do rascunho ao link
			</p>
			<h2 class="font-display text-[40px] leading-[1.08] font-semibold tracking-[-0.025em]">
				Três passos, e a turma já pode começar.
			</h2>
		</div>
		<div class="grid gap-3.5 md:grid-cols-3">
			{#each steps as step, i (step.n)}
				<article
					class="reveal-row rounded-box border border-line bg-base-100 p-[26px] transition-all duration-200
					       hover:-translate-y-[5px] hover:border-primary"
					use:reveal={{ delay: i * 90 }}
				>
					<p
						class="mb-4 font-display text-[44px] leading-none font-extrabold tracking-[-0.03em] text-primary"
					>
						{step.n}
					</p>
					<h3 class="mb-2 font-display text-[21px] font-semibold">{step.title}</h3>
					<p class="text-[14.5px] leading-relaxed text-base-content/65">{step.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<!-- 6 · Qualquer idioma -->
	<section id="idiomas" class="pt-[72px]">
		<div
			class="reveal-row overflow-hidden rounded-[20px] border border-line bg-base-100"
			use:reveal
		>
			<div class="max-w-[66ch] px-11 pt-10 pb-7">
				<p class="mb-4 text-xs font-bold tracking-[0.14em] text-primary uppercase">
					Qualquer idioma
				</p>
				<h2
					class="mb-3.5 font-display text-[38px] leading-[1.1] font-semibold tracking-[-0.025em] text-pretty"
				>
					Nenhuma regra de língua está no lugar errado.
				</h2>
				<p class="text-[16.5px] leading-relaxed text-base-content/65">
					Japonês, chinês e tailandês não separam palavras por espaço, e o sistema sabe disso. Árabe
					e hebraico escrevem da direita para a esquerda, e a interface pode continuar em português
					enquanto o conteúdo vira. Acento composto e pré-composto são a mesma resposta na hora de
					corrigir.
				</p>
			</div>

			<div
				aria-hidden="true"
				class="relative [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)] pt-2
				       pb-8"
			>
				<div class="flex w-max animate-[en-marquee_34s_linear_infinite] gap-3.5">
					{#each [...languages, ...languages] as lang, i (i)}
						<span
							class="rounded-full border border-line bg-base-200 px-[22px] py-3 font-content text-[21px]"
						>
							{lang}
						</span>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- 7 · Planos — a MESMA tabela de `/planos` (`PlanosTabela.svelte`), lendo os
	     mesmos preços de `$lib/content/planos.ts`. Duas cópias divergiriam no
	     primeiro ajuste de preço, e a home é onde a divergência aparece primeiro.
	     Os PREÇOS SÃO PLACEHOLDER — ver o cabeçalho daquele arquivo. -->
	<section id="planos" class="pt-[72px]">
		<div class="reveal-row" use:reveal>
			<PlanosTabela />
		</div>
		<p class="mt-5 text-center text-[13px] text-base-content/65">
			<a href={resolve('/(site)/planos')} class="font-semibold">Ver os planos em detalhe</a>
		</p>
	</section>

	<!-- 8 · CTA -->
	<section class="pt-[72px] pb-24">
		<div
			class="relative grid reveal-row items-center gap-8 overflow-hidden rounded-[20px] bg-primary
			       px-11 py-13 lg:grid-cols-[1fr_220px]"
			use:reveal
		>
			<div class="relative z-1">
				<h2
					class="mb-3.5 max-w-[28ch] font-display text-[42px] leading-[1.04] font-extrabold tracking-[-0.03em]
					       text-pretty text-primary-content"
				>
					Monte a atividade da próxima aula agora.
				</h2>
				<p
					class="mb-6 max-w-[46ch] text-[17px] leading-relaxed text-[color-mix(in_oklab,var(--color-primary-content)_84%,var(--color-primary))]"
				>
					Você precisa de uma conta. Seus alunos, não.
				</p>
				<div class="flex flex-wrap gap-3">
					<Button
						href={resolve('/(auth)/cadastro')}
						size="lg"
						class="border-none bg-primary-content text-[17px] text-primary no-underline"
					>
						Criar minha conta
					</Button>
					<Button
						href={resolve('/(site)/contato')}
						variant="outline"
						size="lg"
						class="border-[1.5px] border-primary-content/60 text-[17px] text-primary-content no-underline hover:bg-primary-content/15"
					>
						Falar com a gente
					</Button>
				</div>
			</div>
			<div aria-hidden="true" class="relative h-[180px]">
				<div
					class="absolute end-[4%] top-0 size-[130px] animate-[en-spin_30s_linear_infinite]
					       rounded-full border-2 border-dashed border-primary-content/45"
				></div>
				<div
					class="absolute start-0 bottom-[6%] h-[82px] w-[92px] animate-[en-drift-spin_22s_ease-in-out_infinite]
					       bg-primary-content/25 [clip-path:polygon(50%_0%,100%_100%,0%_100%)]"
				></div>
				<div
					class="absolute end-[34%] bottom-[14%] size-[46px] animate-[en-breathe_7s_ease-in-out_infinite]
					       bg-primary-content/30 [clip-path:polygon(25%_3%,75%_3%,100%_50%,75%_97%,25%_97%,0%_50%)]"
				></div>
			</div>
		</div>
	</section>
</div>

<SiteFooter />
