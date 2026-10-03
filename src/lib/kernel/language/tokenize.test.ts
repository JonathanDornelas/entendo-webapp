import { describe, expect, it } from 'vitest';
import { tokenize } from './tokenize';

describe('tokenize', () => {
	// Regra inviolável nº 5: japonês não separa palavras por espaço.
	it('segmenta japonês sem depender de espaço', () => {
		const tokens = tokenize('私は学生です', { tag: 'ja-JP' });

		expect(tokens.length).toBeGreaterThan(1);
		expect(tokens).toContain('学生');
	});

	it('segmenta português por palavra', () => {
		const tokens = tokenize('Bom dia, tudo bem?', { tag: 'pt-BR' });

		expect(tokens).toEqual(['Bom', 'dia', 'tudo', 'bem']);
	});
});
