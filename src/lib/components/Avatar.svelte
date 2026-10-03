<script lang="ts">
	// O avatar da conta, desenhado do código. Ver `$lib/avatar/montar.ts` para o
	// porquê de guardar dezoito números em vez de uma imagem.
	//
	// **Sem código, cai nas iniciais.** Não é um estado de erro: é o que toda
	// conta antiga tem antes de alguém abrir o editor, e é o que a lista de
	// turma mostra para quem nunca montou o seu. Um quadrado vazio ali pareceria
	// avatar que não carregou.
	import { montarAvatar } from '$lib/avatar/montar';

	let {
		codigo = null,
		/** Nome de quem é o avatar — vira as iniciais quando não há código. */
		nome = '',
		/** Lado em px. 32 é o mínimo em que o fundo ainda diferencia duas pessoas. */
		size = 40,
		/** Raio da moldura. `rounded-full` no cabeçalho, raio pequeno nas listas. */
		radius = 'rounded-[8px]',
		class: className = ''
	}: {
		codigo?: string | null;
		nome?: string;
		size?: number;
		radius?: string;
		class?: string;
	} = $props();

	const avatar = $derived(codigo ? montarAvatar(codigo) : null);

	const iniciais = $derived(
		nome
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((parte) => parte[0]?.toUpperCase())
			.join('') || '?'
	);
</script>

{#if avatar}
	<!-- `aria-hidden` porque o avatar NUNCA é a única forma de saber de quem é a
	     linha: o nome está sempre ao lado. Anunciar "imagem" aqui só somaria
	     ruído para quem usa leitor de tela. -->
	<span
		class="block shrink-0 overflow-hidden {radius} {className}"
		style="width: {size}px; height: {size}px; background: {avatar.bg};"
		aria-hidden="true"
	>
		<!-- `shape-rendering="crispEdges"` é o que faz pixel art continuar pixel
		     art: sem ele o browser suaviza a escala e cada quadrado ganha uma
		     borda cinza. -->
		<svg
			viewBox="0 0 16 16"
			width="100%"
			height="100%"
			shape-rendering="crispEdges"
			class="block"
			role="presentation"
		>
			{#each avatar.faixas as faixa, i (i)}
				<rect x={faixa.x} y={faixa.y} width={faixa.w} height="1" fill={faixa.f} />
			{/each}
		</svg>
	</span>
{:else}
	<span
		class="grid shrink-0 place-items-center bg-base-300 font-bold text-primary {radius} {className}"
		style="width: {size}px; height: {size}px; font-size: {Math.max(9, Math.round(size * 0.36))}px;"
		aria-hidden="true">{iniciais}</span
	>
{/if}
