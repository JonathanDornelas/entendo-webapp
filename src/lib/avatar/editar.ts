/**
 * As operações do EDITOR sobre o código do avatar. Puras e fora do componente
 * de propósito: a regra dos três acessórios é a única lógica de verdade do
 * editor, e ela merece teste sem montar uma tela.
 */
import { CASAS_ACESSORIO, MAX_ACESSORIOS } from './catalogo';
import { CASAS, LIMITES, normalizar } from './montar';

/** As dezoito casas, sempre completas. */
function casas(codigo: string): number[] {
	return normalizar(codigo).split('-').map(Number);
}

/** Troca UMA casa e devolve o código novo. Não grava nada. */
export function trocarCasa(codigo: string, i: number, valor: number): string {
	const n = casas(codigo);
	if (i < 0 || i >= CASAS) return n.join('-');
	n[i] = Math.max(0, valor) % (LIMITES[i] ?? LIMITES[13]!);
	return n.join('-');
}

/**
 * Quais acessórios estão ligados, na ordem das casas. Zero é "nenhum", então
 * ele não conta como peça ligada — é a ausência dela.
 */
export function acessoriosLigados(codigo: string): number[] {
	const n = casas(codigo);
	return CASAS_ACESSORIO.map((casa) => n[casa] ?? 0).filter((v) => v > 0);
}

/**
 * Liga ou desliga um acessório. É a única escolha MÚLTIPLA do editor: dá para
 * usar até três peças ao mesmo tempo (coroa + fone + espada).
 *
 * Passando o índice 0 ("nenhum") limpa as três casas — é assim que se tira
 * tudo sem precisar desligar peça por peça. Chegando no teto, a mais antiga sai
 * para a nova entrar: recusar em silêncio deixaria o toque sem resposta, e
 * avisar "já tem três" num editor de enfeite seria cerimônia demais.
 */
export function alternarAcessorio(codigo: string, peca: number): string {
	const ligados = acessoriosLigados(codigo);
	const proximos =
		peca === 0
			? []
			: ligados.includes(peca)
				? ligados.filter((v) => v !== peca)
				: [...ligados, peca].slice(-MAX_ACESSORIOS);

	let saida = codigo;
	CASAS_ACESSORIO.forEach((casa, i) => {
		saida = trocarCasa(saida, casa, proximos[i] ?? 0);
	});
	return saida;
}

/**
 * O código que a MINIATURA de uma opção deve mostrar: o avatar de agora com
 * aquela peça trocada. É o que faz cada botão do editor mostrar a escolha no
 * rosto da própria pessoa, em vez de um manequim genérico.
 *
 * Em acessório a miniatura mostra a peça SOZINHA (as outras duas casas
 * zeradas): com as três somadas não daria para ver qual delas o botão oferece.
 */
export function codigoDaOpcao(codigo: string, iForma: number, peca: number): string {
	if (iForma !== CASAS_ACESSORIO[0]) return trocarCasa(codigo, iForma, peca);

	let saida = codigo;
	CASAS_ACESSORIO.forEach((casa, i) => {
		saida = trocarCasa(saida, casa, i === 0 ? peca : 0);
	});
	return saida;
}
