<script lang="ts">
	// O avatar da conta, desenhado do código. Ver `$lib/avatar/montar.ts` para o
	// porquê de guardar dezoito números em vez de uma imagem.
	//
	// **Sempre um rosto, nunca iniciais.** Sem código gravado — a conta antiga
	// que nunca abriu o editor, o aluno da chamada que não tem conta — o desenho
	// é o `avatarPadrao` do NOME: o mesmo rosto para a mesma pessoa em toda
	// tela, sem gravar nada. Conta nova já nasce com um sorteado.
	import { avatarPadrao, montarAvatar } from '$lib/avatar/montar';

	let {
		codigo = null,
		/** Nome de quem é o avatar — a semente do rosto quando não há código. */
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

	const avatar = $derived(montarAvatar(codigo || avatarPadrao(nome)));
</script>

<!-- `aria-hidden` porque o avatar NUNCA é a única forma de saber de quem é a
     linha: o nome está sempre ao lado. Anunciar "imagem" aqui só somaria ruído
     para quem usa leitor de tela. -->
<span
	class="block shrink-0 overflow-hidden {radius} {className}"
	style="width: {size}px; height: {size}px; background: {avatar.bg};"
	aria-hidden="true"
>
	<!-- `shape-rendering="crispEdges"` é o que faz pixel art continuar pixel
	     art: sem ele o browser suaviza a escala e cada quadrado ganha uma borda
	     cinza. -->
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
