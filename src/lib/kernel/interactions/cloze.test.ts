import { describe, expect, it } from 'vitest';
import { cloze, type ClozePayload } from './cloze';
import { ptBR } from '../language/profiles/pt-BR';
import { jaJP } from '../language/profiles/ja-JP';

const seed = 'attempt-seed-1';

describe('cloze', () => {
	const payload: ClozePayload = {
		masked: 'She ___ ___ working here since 2019.',
		accepted: ['has been', "she's been"]
	};

	it('pontua a resposta certa', () => {
		expect(cloze.grade(payload, { text: 'has been' }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('aceita a variante também cadastrada', () => {
		expect(cloze.grade(payload, { text: "she's been" }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('pontua a resposta errada', () => {
		const result = cloze.grade(payload, { text: 'xyz' }, ptBR, seed);
		expect(result.ok && result.value.value).toBe(0);
	});

	it('dá parcial para a resposta quase certa', () => {
		const result = cloze.grade(payload, { text: 'has ben' }, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBeGreaterThan(0);
		expect(result.value.value).toBeLessThan(1);
	});

	it('toRuntime expõe a frase mascarada mas nunca o gabarito', () => {
		const runtime = cloze.toRuntime(payload, seed);
		// `blanks` é a LARGURA de cada lacuna, em caracteres: duas lacunas para
		// "has been" (8 caracteres) saem com 4 cada. Vazamento deliberado e
		// medido — comprimento, jamais as letras.
		expect(runtime).toEqual({ masked: 'She ___ ___ working here since 2019.', blanks: [4, 4] });
		const serialized = JSON.stringify(runtime);
		expect(serialized).not.toContain('accepted');
		expect(serialized).not.toContain('has been');
	});

	it('funciona com japonês (sem espaço entre palavras)', () => {
		const ja: ClozePayload = { masked: '私は___です', accepted: ['学生'] };
		expect(cloze.grade(ja, { text: '学生' }, jaJP, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('trata a forma composta e a decomposta do diacrítico como iguais', () => {
		const acentuado: ClozePayload = {
			masked: 'Ele toma ___ de manhã.',
			accepted: ['café'.normalize('NFD')] // gabarito gravado decomposto
		};
		expect(cloze.grade(acentuado, { text: 'café'.normalize('NFC') }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});
});
