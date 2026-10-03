import { describe, expect, it } from 'vitest';
import { order, type OrderPayload } from './order';
import { ptBR } from '../language/profiles/pt-BR';
import { jaJP } from '../language/profiles/ja-JP';

describe('order', () => {
	// Quatro falas de propósito: com três, inverter deixaria a do meio na
	// posição certa e o teste de "tudo errado" nunca daria zero.
	const payload: OrderPayload = {
		lines: ['Good morning!', 'Good morning. How are you?', 'Fine, thanks. And you?', 'Doing great.']
	};
	const seed = 'attempt-seed-1';

	function ids(texts: string[], p: OrderPayload = payload, s = seed) {
		const runtime = order.toRuntime(p, s);
		return texts.map((t) => runtime.lines.find((l) => l.text === t)!.id);
	}

	it('pontua a ordem certa', () => {
		const answer = { sequence: ids(payload.lines) };
		expect(order.grade(payload, answer, ptBR, seed)).toEqual({ ok: true, value: { value: 1 } });
	});

	it('pontua zero para a ordem invertida e marca cada linha fora de lugar', () => {
		const invertida = [...payload.lines].reverse();
		const answer = { sequence: ids(invertida) };
		const result = order.grade(payload, answer, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBe(0);
		// A ordem que ELE montou, marcada — não um número para ele recontar.
		expect(result.value.marks).toEqual(invertida.map((text) => ({ text, ok: false })));
		expect(result.value.feedback).not.toMatch(/\d/);
	});

	it('dá parcial quando só o final está trocado', () => {
		const answer = {
			sequence: ids([
				'Good morning!',
				'Good morning. How are you?',
				'Doing great.',
				'Fine, thanks. And you?'
			])
		};
		const result = order.grade(payload, answer, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBeGreaterThan(0);
		expect(result.value.value).toBeLessThan(1);
	});

	it('toRuntime não entrega a ordem certa junto', () => {
		const runtime = order.toRuntime(payload, seed);
		expect(Object.keys(runtime)).toEqual(['lines']);
		expect(JSON.stringify(runtime)).not.toContain('originalIndex');
		// determinístico — regra inviolável nº 8: F5 não reembaralha
		expect(order.toRuntime(payload, seed)).toEqual(runtime);
	});

	it('funciona com japonês (sem espaço entre palavras)', () => {
		const ja: OrderPayload = { lines: ['おはよう。', '元気ですか。', 'はい、元気です。'] };
		const answer = { sequence: ids(ja.lines, ja, 'seed-ja') };
		expect(order.grade(ja, answer, jaJP, 'seed-ja')).toEqual({ ok: true, value: { value: 1 } });
	});

	it('funciona com linhas acentuadas (pt-BR)', () => {
		const acentuado: OrderPayload = { lines: ['Você está bem?', 'Estou ótimo, obrigado.'] };
		const answer = { sequence: ids(acentuado.lines, acentuado, seed) };
		expect(order.grade(acentuado, answer, ptBR, seed)).toEqual({ ok: true, value: { value: 1 } });
	});
});
