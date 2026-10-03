/**
 * Código de acesso da atividade — as 4 letras que o professor dita em aula.
 *
 * **Nunca derive o código do slug.** O slug é público (está no link), então um
 * código tirado dele não protege nada: quem tem o link tem o código. Era assim
 * que funcionava antes.
 *
 * O alfabeto não tem `I` nem `O`: ditado em voz alta e escrito num quadro,
 * eles viram 1 e 0 na mão do aluno.
 */

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const TAMANHO_CODIGO = 4;

export function gerarCodigoAcesso(): string {
	// `crypto` e não `Math.random`: o código é a única barreira de uma
	// atividade fechada, e um gerador previsível não é barreira nenhuma.
	const bytes = crypto.getRandomValues(new Uint8Array(TAMANHO_CODIGO));
	return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/**
 * O que o professor digitou vira um código válido, ou `null`. Aceita minúscula
 * e espaço porque é assim que se digita; recusa letra fora do alfabeto em vez
 * de trocar por outra em silêncio.
 */
export function normalizarCodigoAcesso(bruto: string | undefined | null): string | null {
	if (!bruto) return null;
	const limpo = bruto.toUpperCase().replace(/[^A-Z]/g, '');
	if (limpo.length !== TAMANHO_CODIGO) return null;
	return [...limpo].every((letra) => ALFABETO.includes(letra)) ? limpo : null;
}

/** Comparação do lado do servidor — o aluno pode digitar em minúscula. */
export function codigoConfere(esperado: string | null, digitado: string): boolean {
	if (!esperado) return false;
	return normalizarCodigoAcesso(digitado) === esperado;
}
