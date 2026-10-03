/**
 * O que uma tecla do teclado virtual faz com o texto do campo. Puro de
 * propósito: é a parte que dá errado de forma silenciosa (a letra entra no fim
 * em vez de no cursor, o apagar leva a palavra junto), e ela merece teste sem
 * montar uma tela.
 *
 * As posições são as do `selectionStart`/`selectionEnd` do campo — unidades
 * UTF-16, que é como o browser as conta.
 */

export interface Edicao {
	valor: string;
	/** Onde o cursor deve ficar depois da edição. */
	cursor: number;
}

/**
 * Insere o texto NO CURSOR, substituindo a seleção se houver uma. Pôr no fim
 * seria o erro óbvio: o aluno volta para corrigir uma letra no meio da frase e
 * a correção aparece no final.
 *
 * Com `limite`, a inserção que estouraria o tamanho é recusada inteira em vez
 * de cortada — meia letra devanágari no fim do campo é pior do que nenhuma.
 */
export function inserir(
	valor: string,
	inicio: number,
	fim: number,
	texto: string,
	limite = Number.POSITIVE_INFINITY
): Edicao {
	const [a, b] = ordenar(valor, inicio, fim);
	const novo = valor.slice(0, a) + texto + valor.slice(b);
	if (novo.length > limite) return { valor, cursor: b };
	return { valor: novo, cursor: a + texto.length };
}

/**
 * Apaga como o teclado do aparelho apaga: a seleção, se houver uma; senão, UM
 * PONTO DE CÓDIGO antes do cursor.
 *
 * **Ponto de código, não grafema, e isso é deliberado.** Em devanágari `कि` é um
 * grafema só (consoante + matra), mas quem erra a vogal quer trocar a matra, não
 * perder a consoante junto — e é assim que todo teclado índico nativo apaga. O
 * mesmo vale para o árabe com tashkeel.
 *
 * E ponto de código, não unidade UTF-16: um caractere fora do plano básico são
 * duas unidades, e apagar só uma deixaria meia letra inválida no campo.
 */
export function apagar(valor: string, inicio: number, fim: number): Edicao {
	const [a, b] = ordenar(valor, inicio, fim);
	if (a !== b) return { valor: valor.slice(0, a) + valor.slice(b), cursor: a };
	if (a === 0) return { valor, cursor: 0 };

	const ehParSubstituto =
		a >= 2 && isLowSurrogate(valor.charCodeAt(a - 1)) && isHighSurrogate(valor.charCodeAt(a - 2));
	const tamanho = ehParSubstituto ? 2 : 1;
	return { valor: valor.slice(0, a - tamanho) + valor.slice(a), cursor: a - tamanho };
}

/**
 * Troca o caractere ANTES do cursor pelo que o mapa diz — o `゛` que faz `か`
 * virar `が`. Sem nada no mapa para aquela letra, nada muda: tocar `゛` depois de
 * `あ` não tem o que sonorizar, e inventar um resultado seria pior.
 *
 * Com uma seleção, age na última letra DELA e desfaz a seleção: é a letra que
 * o aluno acabou de ver, e apagar o resto para trocar uma seria surpresa.
 *
 * Um ponto de código por vez, pelo mesmo motivo do `apagar`.
 */
export function trocarAnterior(
	valor: string,
	inicio: number,
	fim: number,
	mapa: Record<string, string>
): Edicao {
	const [, b] = ordenar(valor, inicio, fim);
	if (b === 0) return { valor, cursor: b };

	const ehParSubstituto =
		b >= 2 && isLowSurrogate(valor.charCodeAt(b - 1)) && isHighSurrogate(valor.charCodeAt(b - 2));
	const tamanho = ehParSubstituto ? 2 : 1;
	const anterior = valor.slice(b - tamanho, b);
	const novo = mapa[anterior];
	if (novo === undefined) return { valor, cursor: b };
	return {
		valor: valor.slice(0, b - tamanho) + novo + valor.slice(b),
		cursor: b - tamanho + novo.length
	};
}

/** Corrige posições fora do texto e seleção de trás para a frente. */
function ordenar(valor: string, inicio: number, fim: number): [number, number] {
	const limitar = (n: number) =>
		Number.isFinite(n) ? Math.max(0, Math.min(valor.length, n)) : valor.length;
	const a = limitar(inicio);
	const b = limitar(fim);
	return a <= b ? [a, b] : [b, a];
}

function isHighSurrogate(c: number) {
	return c >= 0xd800 && c <= 0xdbff;
}
function isLowSurrogate(c: number) {
	return c >= 0xdc00 && c <= 0xdfff;
}
