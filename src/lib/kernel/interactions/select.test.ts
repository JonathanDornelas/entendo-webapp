import { describe, expect, it } from 'vitest';
import { select, type SelectPayload } from './select';
import { ptBR } from '../language/profiles/pt-BR';
import { jaJP } from '../language/profiles/ja-JP';

const seed = 'attempt-seed-1';

describe('select', () => {
	// "Marque o verbo no passado": só os candidatos são selecionáveis.
	const payload: SelectPayload = {
		segments: [
			{ text: 'She ', selectable: false },
			{ text: 'worked', selectable: true },
			{ text: ' here and now she ', selectable: false },
			{ text: 'works', selectable: true },
			{ text: ' there.', selectable: false }
		],
		correctIndex: 1
	};

	it('pontua o trecho certo', () => {
		expect(select.grade(payload, { segmentId: 'seg1' }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('pontua o trecho errado', () => {
		expect(select.grade(payload, { segmentId: 'seg3' }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 0 }
		});
	});

	// "Quase certa" aqui é o trecho não selecionável vizinho do correto: tem
	// que virar erro de payload, não uma pontuação silenciosa.
	it('recusa um segmento que não é selecionável', () => {
		const result = select.grade(payload, { segmentId: 'seg0' }, ptBR, seed);
		expect(result).toEqual({ ok: false, error: 'segmento não é selecionável' });
	});

	it('toRuntime nunca expõe correctIndex', () => {
		const runtime = select.toRuntime(payload, seed);
		expect(JSON.stringify(runtime)).not.toContain('correctIndex');
		expect(Object.keys(runtime)).toEqual(['segments']);
		expect(runtime.segments).toHaveLength(5);
	});

	it('funciona com japonês (sem espaço entre palavras)', () => {
		const ja: SelectPayload = {
			segments: [
				{ text: '私は', selectable: false },
				{ text: '学生', selectable: true },
				{ text: 'です。', selectable: false }
			],
			correctIndex: 1
		};
		expect(select.grade(ja, { segmentId: 'seg1' }, jaJP, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('funciona com trechos acentuados (pt-BR)', () => {
		const acentuado: SelectPayload = {
			segments: [
				{ text: 'Ele toma ', selectable: false },
				{ text: 'café', selectable: true },
				{ text: ' de manhã.', selectable: false }
			],
			correctIndex: 1
		};
		expect(select.grade(acentuado, { segmentId: 'seg1' }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});
});
