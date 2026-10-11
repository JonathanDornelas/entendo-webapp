import { describe, expect, it } from 'vitest';
import { LIMITES, PLANOS_PAGOS, NOME_DO_PLANO } from './catalogo';
import { planos } from '$lib/content/planos';

/**
 * A vitrine (`$lib/content/planos.ts`) e a regra (`catalogo.ts`) não podem
 * divergir: o que a tabela PROMETE tem de ser o que `can()` deixa fazer.
 */
describe('catálogo × vitrine', () => {
	it('todo plano pago tem cartão, e o Scholar também', () => {
		expect(planos.map((p) => p.id)).toEqual([...PLANOS_PAGOS, 'scholar']);
	});

	it.each(PLANOS_PAGOS)('os números do cartão %s são os do catálogo', (id) => {
		const cartao = planos.find((p) => p.id === id)!;
		const texto = cartao.recursos.map((r) => r.label).join(' | ');
		const l = LIMITES[id];
		expect(texto).toContain(l.atividades.toLocaleString('pt-BR'));
		expect(texto).toContain(l.materiais.toLocaleString('pt-BR'));
		if (l.ia) expect(texto).toContain(l.creditosPorCiclo.toLocaleString('pt-BR'));
		expect(cartao.recursos.some((r) => r.label.includes('IA') && r.incluso === l.ia)).toBe(true);
		expect(cartao.nome).toBe(NOME_DO_PLANO[id]);
	});

	it('os limites crescem do básico ao super', () => {
		expect(LIMITES.basico.atividades).toBeLessThan(LIMITES.pro.atividades);
		expect(LIMITES.pro.atividades).toBeLessThan(LIMITES.super.atividades);
		expect(LIMITES.basico.ia).toBe(false);
	});
});
