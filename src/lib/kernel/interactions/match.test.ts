import { describe, expect, it } from 'vitest';
import { match, type MatchPayload } from './match';
import { ptBR } from '../language/profiles/pt-BR';
import { jaJP } from '../language/profiles/ja-JP';

describe('match', () => {
	const payload: MatchPayload = {
		pairs: [
			{ left: 'apple', right: 'maçã' },
			{ left: 'bread', right: 'pão' },
			{ left: 'cheese', right: 'queijo' }
		]
	};
	const seed = 'attempt-seed-1';

	function pairIds(pairs: [string, string][], p: MatchPayload = payload, s = seed) {
		const runtime = match.toRuntime(p, s);
		return pairs.map(([left, right]) => ({
			left: runtime.left.find((l) => l.text === left)!.id,
			right: runtime.right.find((r) => r.text === right)!.id
		}));
	}

	it('pontua todos os pares certos', () => {
		const answer = {
			pairs: pairIds([
				['apple', 'maçã'],
				['bread', 'pão'],
				['cheese', 'queijo']
			])
		};
		expect(match.grade(payload, answer, ptBR, seed)).toEqual({ ok: true, value: { value: 1 } });
	});

	it('pontua zero quando todos os pares estão errados', () => {
		const answer = {
			pairs: pairIds([
				['apple', 'pão'],
				['bread', 'queijo'],
				['cheese', 'maçã']
			])
		};
		const result = match.grade(payload, answer, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBe(0);
		// Marcas, não contagem: "0 de 3" não diz QUAIS ligações não fecharam.
		expect(result.value.marks).toHaveLength(3);
		expect(result.value.marks?.every((m) => !m.ok)).toBe(true);
		// Diferente de `assemble`, o `match` NÃO devolve o pareamento certo: os
		// cartões estão na tela e a correção é a pintura deles. Entregar o
		// gabarito por escrito aqui resolveria o exercício inteiro.
		expect(result.value.expected).toBeUndefined();
		expect(result.value.feedback).toBe('');
	});

	// Parcial tem faixa própria em todo gráfico (paginas.md) — acertar dois de
	// três não pode virar zero.
	it('dá parcial quando parte dos pares está certa', () => {
		const answer = {
			pairs: pairIds([
				['apple', 'maçã'],
				['bread', 'pão'],
				['cheese', 'maçã']
			])
		};
		const result = match.grade(payload, answer, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBeCloseTo(2 / 3);
	});

	it('toRuntime não deixa o par certo dedutível pelo id', () => {
		const runtime = match.toRuntime(payload, seed);
		const serialized = JSON.stringify(runtime);
		expect(serialized).not.toContain('originalIndex');
		expect(Object.keys(runtime).sort()).toEqual(['left', 'right']);
		// Cada coluna só carrega o próprio texto: nada no item da esquerda
		// aponta para o da direita.
		expect(runtime.left.every((l) => Object.keys(l).sort().join() === 'id,text')).toBe(true);
		expect(runtime.left.map((l) => l.text)).not.toContain('maçã');
	});

	it('funciona com japonês (sem espaço entre palavras)', () => {
		const ja: MatchPayload = {
			pairs: [
				{ left: '学生', right: 'estudante' },
				{ left: '先生', right: 'professor' }
			]
		};
		const answer = {
			pairs: pairIds(
				[
					['学生', 'estudante'],
					['先生', 'professor']
				],
				ja,
				'seed-ja'
			)
		};
		expect(match.grade(ja, answer, jaJP, 'seed-ja')).toEqual({ ok: true, value: { value: 1 } });
	});

	it('funciona com pares acentuados (pt-BR)', () => {
		const answer = { pairs: pairIds([['apple', 'maçã']]) };
		const result = match.grade(payload, answer, ptBR, seed);
		expect(result.ok && result.value.value).toBeCloseTo(1 / 3);
	});
});
