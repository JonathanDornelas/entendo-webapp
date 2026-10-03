import type { LanguageProfile } from './profile';

/**
 * Aplica as equivalências do profile a um texto JÁ normalizado: cada forma
 * variante vira a canônica do grupo dela. Palavra inteira, nunca pedaço —
 * "one" dentro de "someone" fica como está.
 *
 * As variantes mais longas entram primeiro: "vinte e um" precisa virar "21"
 * antes de "um" virar "1", senão sobra "vinte e 1".
 *
 * Só faz sentido em língua que separa palavras por espaço — é onde os grupos
 * existem hoje. Um profile de língua sem espaço declara a lista vazia, e isto
 * é um no-op.
 */
export function aplicarEquivalencias(
	texto: string,
	profile: Pick<LanguageProfile, 'equivalences'>
): string {
	const regras = tabela(profile.equivalences);
	if (regras.length === 0) return texto;
	let saida = texto;
	for (const { padrao, canonica } of regras) saida = saida.replace(padrao, canonica);
	return saida;
}

interface Regra {
	padrao: RegExp;
	canonica: string;
}

// As regex são compiladas UMA vez por lista: `normalize` roda em toda
// comparação, e recompilar centenas de padrões a cada chamada custaria mais do
// que a comparação em si.
const cache = new WeakMap<string[][], Regra[]>();

function tabela(grupos: string[][]): Regra[] {
	const pronta = cache.get(grupos);
	if (pronta) return pronta;

	const regras: Regra[] = [];
	for (const grupo of grupos) {
		const [canonica, ...variantes] = grupo;
		if (!canonica) continue;
		for (const variante of variantes) {
			if (!variante || variante === canonica) continue;
			regras.push({
				// Fronteira de palavra à mão: o `\b` do JavaScript só conhece ASCII, e
				// "é" ou "ã" na ponta da palavra o deixariam ver fronteira no meio.
				padrao: new RegExp(`(?<![\\p{L}\\p{N}])${escapar(variante)}(?![\\p{L}\\p{N}])`, 'gu'),
				canonica
			});
		}
	}
	regras.sort((a, b) => b.padrao.source.length - a.padrao.source.length);
	cache.set(grupos, regras);
	return regras;
}

function escapar(texto: string): string {
	return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Os grupos de numerais de uma língua, de 0 a 99, a partir de duas listas:
 * as formas de 0 a 19 e as dezenas de 20 a 90. O canônico é o DÍGITO, porque é
 * o que o ASR escreve.
 *
 * `compor` monta o composto (21, 32, ...) da língua: em inglês "twenty one" (o
 * hífen já saiu na normalização), em português "vinte e um", em espanhol
 * "treinta y uno". Quem tem forma própria para uma faixa — o "veintiuno" do
 * espanhol — passa em `extras`, que entram como grupos a mais.
 *
 * Formas alternativas de um mesmo número (o "um"/"uma" e o "dois"/"duas" do
 * português) vão separadas por "|" na lista, e viram membros do mesmo grupo.
 */
export function numerais(
	ateDezenove: string[],
	dezenas: string[],
	compor: (dezena: string, unidade: string) => string[],
	extras: string[][] = []
): string[][] {
	const grupos: string[][] = [];
	const formas = (entrada: string) => entrada.split('|');

	// Grupo sem variante não gera regra nenhuma (`tabela` itera `grupo.slice(1)`),
	// então ele é peso morto — e some por aqui em vez de precisar ser filtrado por
	// quem lê. Aparecia em dois casos legítimos: a língua cujo composto tem forma
	// própria e vai em `extras` (o "veintiuno" do espanhol) e a língua sem
	// composto regular nenhum, onde `compor` devolve vazio de propósito (híndi,
	// em que 21 a 99 são palavras irregulares).
	const guardar = (grupo: string[]) => {
		if (grupo.length > 1) grupos.push(grupo);
	};

	ateDezenove.forEach((entrada, n) => guardar([String(n), ...formas(entrada)]));
	dezenas.forEach((dezena, i) => {
		const valor = (i + 2) * 10;
		guardar([String(valor), ...formas(dezena)]);
		for (let unidade = 1; unidade <= 9; unidade++) {
			const compostas = formas(dezena).flatMap((d) =>
				formas(ateDezenove[unidade] ?? '').flatMap((u) => compor(d, u))
			);
			guardar([String(valor + unidade), ...compostas]);
		}
	});
	return [...grupos, ...extras];
}
