import { describe, expect, it } from 'vitest';
import { criarLimite } from './limite-por-ip';

describe('criarLimite', () => {
	it('deixa passar até o máximo na janela, e recomeça depois dela', () => {
		const limite = criarLimite({ maximo: 2, janelaMs: 1000 });
		expect([
			limite.permitir('ip', 0),
			limite.permitir('ip', 10),
			limite.permitir('ip', 20)
		]).toEqual([true, true, false]);
		expect(limite.permitir('ip', 1001)).toBe(true);
	});

	it('cada chave tem a sua contagem', () => {
		const limite = criarLimite({ maximo: 1, janelaMs: 1000 });
		expect([limite.permitir('a', 0), limite.permitir('b', 0), limite.permitir('a', 1)]).toEqual([
			true,
			true,
			false
		]);
	});
});
