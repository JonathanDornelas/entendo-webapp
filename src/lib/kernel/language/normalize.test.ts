import { describe, expect, it } from 'vitest';
import { normalize } from './normalize';
import type { Normalizer } from './profile';

describe('normalize', () => {
	const profile = {
		tag: 'pt-BR',
		normalizers: ['nfkc', 'lowercase'] satisfies Normalizer[],
		diacritics: 'significant' as const
	};

	// Regra inviolável nº 6: 'é' composto (U+00E9) e 'é' decomposto (e + acento
	// combinante, U+0301) são pontos de código diferentes.
	it('trata a forma composta e a pré-composta do mesmo caractere como iguais', () => {
		const precomposed = 'café'.normalize('NFC');
		const decomposed = precomposed.normalize('NFD');

		expect(precomposed).not.toBe(decomposed);
		expect(normalize(precomposed, profile)).toBe(normalize(decomposed, profile));
	});

	it('normaliza maiúsculas respeitando o locale do profile', () => {
		expect(normalize('CAFÉ', profile)).toBe('café');
	});

	it('mantém o acento quando diacritics é significant', () => {
		expect(normalize('café', profile)).toBe('café');
	});

	it('descarta o acento quando diacritics é tolerant', () => {
		const tolerant = { ...profile, diacritics: 'tolerant' as const };
		expect(normalize('café', tolerant)).toBe('cafe');
		expect(normalize('cafe', tolerant)).toBe('cafe');
	});
});
