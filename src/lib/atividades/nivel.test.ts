import { describe, expect, it } from 'vitest';
import { NIVEIS, nivelOuNulo, rotuloDoNivel } from './nivel';

describe('nível da atividade', () => {
	it('a escala é a do CEFR, em ordem', () => {
		expect(NIVEIS.map((n) => n.id)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
	});

	it('valor fora da escala vira "sem nível", nunca erro', () => {
		expect(nivelOuNulo('B1')).toBe('B1');
		expect(nivelOuNulo('b1')).toBeNull();
		expect(nivelOuNulo('N5')).toBeNull();
		expect(nivelOuNulo(null)).toBeNull();
	});

	it('o rótulo junta a sigla e o nome', () => {
		expect(rotuloDoNivel('B1')).toBe('B1 · Intermediário');
	});
});
