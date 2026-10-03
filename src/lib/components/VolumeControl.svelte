<script lang="ts">
	/**
	 * O regulador de volume do Player — TODO o som que a atividade produz: os
	 * efeitos de acerto e erro e o áudio das questões de escuta.
	 *
	 * Eram dois controles antes, e o de baixo era o do aparelho: quem abaixava
	 * aqui numa sala cheia continuava com a frase em inglês no talo. São coisas
	 * diferentes por dentro (efeito é Web Audio, questão é `<audio>`), mas para
	 * quem usa é um volume só — e é assim que ele se comporta.
	 *
	 * Botão de ícone que abre um controle deslizante: o alvo do Player é de
	 * 48px (design-system.md) e um `range` solto no cabeçalho não caberia no
	 * celular. Clicar no ícone alterna mudo; a barra ajusta.
	 */
	import { som } from '$lib/client/sons.svelte';

	let { class: className = '' }: { class?: string } = $props();

	let aberto = $state(false);

	// Três níveis de ícone, porque "tem som" e "está no talo" não são a mesma
	// informação — e mudo precisa ser inconfundível de relance.
	const nivel = $derived(som.volume === 0 ? 'mudo' : som.volume < 0.5 ? 'baixo' : 'alto');
	const rotulo = $derived(
		som.volume === 0 ? 'Som desligado' : `Volume em ${Math.round(som.volume * 100)}%`
	);
</script>

<!-- `onfocusout` no container: mexer no slider tira o foco do botão, e fechar
     ali fecharia o painel no meio do ajuste. -->
<div
	class="relative shrink-0 {className}"
	onfocusout={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) aberto = false;
	}}
>
	<button
		type="button"
		onclick={() => (aberto = !aberto)}
		class="grid size-10 place-items-center rounded-full text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
		aria-label={rotulo}
		aria-expanded={aberto}
		title={rotulo}
	>
		<svg class="size-[19px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"
				stroke="currentColor"
				stroke-width="2"
				stroke-linejoin="round"
			/>
			{#if nivel === 'mudo'}
				<path
					d="M16.5 9.5l5 5M21.5 9.5l-5 5"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			{:else}
				<path
					d="M16 9.5a4 4 0 010 5"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
				{#if nivel === 'alto'}
					<path
						d="M18.5 7a7.5 7.5 0 010 10"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				{/if}
			{/if}
		</svg>
	</button>

	{#if aberto}
		<div
			class="absolute end-0 top-[46px] z-40 w-[232px] rounded-box border border-line bg-base-100 p-3.5 shadow-[0_18px_44px_-24px_rgb(var(--shadow)/0.55)]"
		>
			<div class="mb-2.5 flex items-baseline justify-between gap-2">
				<span class="text-[12.5px] font-semibold">Volume</span>
				<span class="font-mono text-[12px] text-base-content/65">
					{som.volume === 0 ? 'mudo' : `${Math.round(som.volume * 100)}%`}
				</span>
			</div>
			<div class="flex items-center gap-2.5">
				<button
					type="button"
					onclick={() => som.alternarMudo()}
					class="shrink-0 rounded-field px-2 py-1.5 text-[12px] font-bold text-primary hover:bg-base-200"
				>
					{som.volume === 0 ? 'Ligar' : 'Mudo'}
				</button>
				<input
					type="range"
					min="0"
					max="100"
					value={Math.round(som.volume * 100)}
					oninput={(e) => som.definir(Number(e.currentTarget.value) / 100)}
					class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-base-300 accent-primary"
					aria-label="Volume da atividade"
				/>
			</div>
			<p class="mt-2.5 text-[11.5px] leading-snug text-base-content/65">
				Vale para o áudio das questões e para os sons de acerto e erro.
			</p>
		</div>
	{/if}
</div>
