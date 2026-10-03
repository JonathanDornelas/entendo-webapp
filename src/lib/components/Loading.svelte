<script lang="ts">
	/**
	 * As três variações de espera do produto. Todas usam o MESMO vocabulário do
	 * resto da interface — círculo, triângulo, hexágono e anel tracejado — e as
	 * mesmas três cores, então trocar de variante não parece trocar de produto.
	 *
	 * Cada uma tem um lugar:
	 *
	 * | variante | onde                                        | evite                          |
	 * | -------- | ------------------------------------------- | ------------------------------ |
	 * | `orbita` | espera de 3 s ou mais, bloco dedicado a ela | dentro de botão ou linha       |
	 * | `fila`   | espera curta: botão, campo, linha de lista  | centralizada numa tela vazia   |
	 * | `traco`  | sobreposição, cartão recarregando           | abaixo de 24px                 |
	 *
	 * **Quando não usar nenhuma**: se você sabe o formato do que vem, mostre o
	 * formato (`skeleton`, utility do `app.css`). Se o trabalho está numa fila do
	 * servidor e você não sabe quanto falta, use `LoadingBar.svelte` — e nunca
	 * porcentagem, que seria promessa que não se pode cumprir.
	 *
	 * Movimento aqui é decoração: com `prefers-reduced-motion` tudo congela no
	 * primeiro quadro (já tratado no `app.css`) e quem informa a espera é o texto
	 * ao lado. Por isso `label` nunca é opcional de fato — ele é o que o leitor de
	 * tela anuncia, com as formas em si marcadas `aria-hidden`.
	 */
	type Variant = 'orbita' | 'fila' | 'traco';
	/** `brand` usa as cores do tema; `current` herda a cor de quem contém — é o
	 *  que faz o loading dentro de um botão primário sair legível. */
	type Tone = 'brand' | 'current';

	let {
		variant = 'orbita',
		size,
		label = 'Carregando',
		pace = 'normal',
		tone = 'brand',
		class: className = ''
	}: {
		variant?: Variant;
		/** Altura em px. Padrão por variante: órbita 40, fila 14, traço 40. */
		size?: number;
		label?: string;
		/** `devagar` (1,75×) para espera acima de dez segundos: a órbita rápida
		 *  lê como travamento, a lenta lê como trabalho acontecendo. */
		pace?: 'normal' | 'devagar';
		tone?: Tone;
		class?: string;
	} = $props();

	const PADRAO: Record<Variant, number> = { orbita: 40, fila: 14, traco: 40 };
	const px = $derived(size ?? PADRAO[variant]);
	const k = $derived(pace === 'devagar' ? 1.75 : 1);
	const s = (n: number) => `${(n * k).toFixed(2)}s`;

	// Classe inteira e literal por tom: o Tailwind só gera CSS para o que
	// aparece completo no código-fonte, então nada de montar `bg-${cor}`.
	const CORES: Record<Tone, { um: string; dois: string; tres: string; anel: string }> = {
		brand: {
			um: 'bg-primary',
			dois: 'bg-primary/60',
			tres: 'bg-accent/70',
			anel: 'border-primary/35'
		},
		current: {
			um: 'bg-current',
			dois: 'bg-current/60',
			tres: 'bg-current/70',
			anel: 'border-current/35'
		}
	};
	const cor = $derived(CORES[tone]);

	const TRIANGULO = 'polygon(50% 0%, 100% 100%, 0% 100%)';
	const HEXAGONO = 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)';

	// Órbita: três raios e três durações primas entre si.
	const orbita = $derived({
		dot: Math.round(px * 0.22),
		tri: Math.round(px * 0.215),
		hex: Math.round(px * 0.19),
		inset2: Math.round(px * 0.175),
		inset3: Math.round(px * 0.34),
		durA: s(2.6),
		durB: s(3.4),
		durC: s(4.3)
	});

	// Fila: `size` é a altura da linha; o atraso é 1/6 do ciclo, o suficiente
	// para ler como sequência e não como três coisas piscando juntas.
	const fila = $derived.by(() => {
		const dot = Math.max(4, Math.round(px / 1.6));
		const dur = 1.05 + dot * 0.02;
		return {
			dot,
			gap: Math.max(3, Math.round(dot * 0.66)),
			dur: s(dur),
			d2: s(dur / 6),
			d3: s(dur / 3)
		};
	});

	// Traço: uma volta do arco = uma forma no centro. O ciclo do centro é 3× o
	// do arco e cada forma entra com um terço de atraso, então a troca cai
	// junto com a volta.
	const traco = $derived({
		anel: Math.min(2, Math.max(1.5, px * 0.06)),
		arco: Math.round((1.55 + px * 0.0225) * 2) / 2,
		nucleo: Math.round(px * 0.195),
		durAnel: s(5.2),
		durArco: s(1.5),
		durMorph: s(4.5),
		morphD2: s(1.5),
		morphD3: s(3)
	});
</script>

{#if variant === 'orbita'}
	<span
		role="status"
		aria-label={label}
		class="relative block flex-none {className}"
		style="width: {px}px; height: {px}px;"
	>
		<span
			aria-hidden="true"
			class="absolute inset-0"
			style="animation: en-orbit {orbita.durA} linear infinite;"
		>
			<span
				class="absolute start-1/2 top-0 -translate-x-1/2 rounded-full {cor.um}"
				style="width: {orbita.dot}px; height: {orbita.dot}px;"
			></span>
		</span>
		<span
			aria-hidden="true"
			class="absolute"
			style="inset: {orbita.inset2}px; animation: en-orbit-counter {orbita.durB} linear infinite;"
		>
			<span
				class="absolute start-1/2 bottom-0 -translate-x-1/2 {cor.dois}"
				style="width: {orbita.tri}px; height: {orbita.tri - 1}px; clip-path: {TRIANGULO};"
			></span>
		</span>
		<span
			aria-hidden="true"
			class="absolute"
			style="inset: {orbita.inset3}px; animation: en-orbit {orbita.durC} linear infinite;"
		>
			<span
				class="absolute end-0 top-1/2 -translate-y-1/2 {cor.tres}"
				style="width: {orbita.hex}px; height: {orbita.hex + 1}px; clip-path: {HEXAGONO};"
			></span>
		</span>
	</span>
{:else if variant === 'fila'}
	<span
		role="status"
		aria-label={label}
		class="flex flex-none items-end {className}"
		style="gap: {fila.gap}px; height: {px}px;"
	>
		<span
			aria-hidden="true"
			class="rounded-full {cor.um}"
			style="width: {fila.dot}px; height: {fila.dot}px;
			       animation: en-hop {fila.dur} cubic-bezier(0.34, 1.4, 0.5, 1) infinite;"
		></span>
		<span
			aria-hidden="true"
			class={cor.dois}
			style="width: {fila.dot + 1}px; height: {fila.dot}px; clip-path: {TRIANGULO};
			       animation: en-hop {fila.dur} cubic-bezier(0.34, 1.4, 0.5, 1) infinite {fila.d2};"
		></span>
		<span
			aria-hidden="true"
			class={cor.tres}
			style="width: {fila.dot}px; height: {fila.dot + 1}px; clip-path: {HEXAGONO};
			       animation: en-hop {fila.dur} cubic-bezier(0.34, 1.4, 0.5, 1) infinite {fila.d3};"
		></span>
	</span>
{:else}
	<span
		role="status"
		aria-label={label}
		class="relative grid flex-none place-items-center {className}"
		style="width: {px}px; height: {px}px;"
	>
		<span
			aria-hidden="true"
			class="absolute inset-0 rounded-full border-dashed {cor.anel}"
			style="border-width: {traco.anel}px; animation: en-spin {traco.durAnel} linear infinite;"
		></span>
		<!-- Só a borda de cima é opaca: é isso que faz o arco. -->
		<span
			aria-hidden="true"
			class="absolute inset-0 rounded-full border-solid border-s-transparent border-e-transparent border-b-transparent
			       {tone === 'current' ? 'border-t-current' : 'border-t-primary'}"
			style="border-width: {traco.arco}px; animation: en-arc {traco.durArco} cubic-bezier(0.5, 0, 0.5, 1) infinite;"
		></span>
		<span
			aria-hidden="true"
			class="relative block flex-none"
			style="width: {traco.nucleo}px; height: {traco.nucleo}px;"
		>
			<span
				class="absolute inset-0 rounded-full {cor.tres}"
				style="animation: en-morph {traco.durMorph} ease-in-out infinite;"
			></span>
			<span
				class="absolute inset-0 {cor.tres}"
				style="clip-path: {TRIANGULO};
				       animation: en-morph {traco.durMorph} ease-in-out infinite {traco.morphD2};"
			></span>
			<span
				class="absolute inset-0 {cor.tres}"
				style="clip-path: {HEXAGONO};
				       animation: en-morph {traco.durMorph} ease-in-out infinite {traco.morphD3};"
			></span>
		</span>
	</span>
{/if}
