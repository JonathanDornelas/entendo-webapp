/**
 * Distância de edição — base da correção `tolerant` (kernel.md "Correção").
 * Usada só depois do texto passar pelo normalizador do profile (regra
 * inviolável nº 6); nunca compare string crua.
 */
export function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;

	let previous = Array.from({ length: n + 1 }, (_, j) => j);
	for (let i = 1; i <= m; i++) {
		const current = [i];
		for (let j = 1; j <= n; j++) {
			current[j] =
				a[i - 1] === b[j - 1]
					? previous[j - 1]
					: 1 + Math.min(previous[j], current[j - 1], previous[j - 1]);
		}
		previous = current;
	}
	return previous[n];
}

/** 1 = idêntico, 0 = completamente diferente. */
export function similarity(a: string, b: string): number {
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 1;
	return 1 - levenshtein(a, b) / maxLen;
}
