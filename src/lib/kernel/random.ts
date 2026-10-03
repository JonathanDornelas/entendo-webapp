/**
 * Fonte única de aleatoriedade do kernel — regra inviolável nº 8:
 * aleatorização é determinística a partir da seed guardada na tentativa.
 * F5 não muda nada, porque a mesma seed sempre produz a mesma ordem.
 * Nunca `Math.random()` num `toRuntime`.
 */

function hashSeed(seed: string): number {
	let h = 1779033703 ^ seed.length;
	for (let i = 0; i < seed.length; i++) {
		h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	return h >>> 0;
}

// mulberry32 — PRNG determinístico e rápido, suficiente para embaralhar
// alternativas: não é criptográfico, e não precisa ser.
function mulberry32(seedInt: number): () => number {
	let a = seedInt;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function shuffleWithSeed<T>(items: T[], seed: string): T[] {
	const rand = mulberry32(hashSeed(seed));
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export function pickWithSeed<T>(items: T[], count: number, seed: string): T[] {
	return shuffleWithSeed(items, seed).slice(0, Math.max(0, count));
}

export interface RuntimeIdItem<T> {
	id: string;
	text: T;
}

/**
 * Embaralha `items` pela seed e SÓ DEPOIS atribui ids sequenciais — nessa
 * ordem, não na de entrada. Se o id fosse atribuído antes de embaralhar
 * (ex.: pela posição em que o professor digitou), a posição do id em si
 * vazaria informação (ex.: "o item de índice mais alto é sempre o
 * distrator", ou em `match`, "o esquerdo 2 sempre pareia com o direito 2").
 * `toRuntime` e `grade` chamam isto com o mesmo `(items, seed)` para obter
 * exatamente a mesma correspondência id → conteúdo sem precisar guardar
 * estado entre as duas chamadas.
 */
export function assignRuntimeIds<T>(items: T[], seed: string, prefix = 'i'): RuntimeIdItem<T>[] {
	return shuffleWithSeed(items, seed).map((text, i) => ({ id: `${prefix}${i}`, text }));
}
