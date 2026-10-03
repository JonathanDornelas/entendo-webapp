import { describe, expect, it } from 'vitest';
import { assemble, type AssemblePayload } from './assemble';
import { ptBR } from '../language/profiles/pt-BR';
import { jaJP } from '../language/profiles/ja-JP';

describe('assemble', () => {
	const payload: AssemblePayload = {
		tokens: ['Ela', 'trabalha', 'aqui'],
		distractors: ['ontem', 'nunca'],
		accepted: [['Ela', 'trabalha', 'aqui']],
		translation: 'She works here.'
	};
	const seed = 'attempt-seed-1';

	function ids(texts: string[], p: AssemblePayload = payload, s = seed) {
		const runtime = assemble.toRuntime(p, s);
		return texts.map((t) => runtime.tokens.find((tok) => tok.text === t)!.id);
	}

	it('pontua a sequência certa', () => {
		const answer = { sequence: ids(['Ela', 'trabalha', 'aqui']) };
		expect(assemble.grade(payload, answer, ptBR, seed)).toEqual({ ok: true, value: { value: 1 } });
	});

	it('devolve a frase MARCADA, não uma contagem de posições', () => {
		const answer = { sequence: ids(['ontem', 'nunca']) };
		const result = assemble.grade(payload, answer, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBe(0);

		// As marcas são a resposta DELE, na ordem em que montou, para a tela
		// grifar o que saiu do lugar. Contar posições ('8 de 9; a 5ª está fora')
		// obrigava o aluno a recontar a própria frase.
		expect(result.value.marks).toEqual([
			{ text: 'ontem', ok: false },
			{ text: 'nunca', ok: false }
		]);
		expect(result.value.feedback).not.toMatch(/\d/);

		// A marcação NÃO pode virar a porta dos fundos do gabarito: ela tem o
		// tamanho da resposta do aluno e só o texto que ele escolheu.
		expect(result.value.marks).toHaveLength(answer.sequence.length);
		const marcado = result.value.marks?.map((m) => m.text) ?? [];
		for (const token of payload.tokens) expect(marcado).not.toContain(token);
	});

	// A "quase certa" é a que pega bug: duas palavras na posição certa e uma
	// trocada precisa virar PARCIAL, não zero seco (design-system.md
	// "Estado de correção": parcial existe).
	it('dá pontuação parcial para a sequência quase certa, marcando a errada', () => {
		const answer = { sequence: ids(['Ela', 'trabalha', 'ontem']) };
		const result = assemble.grade(payload, answer, ptBR, seed);
		if (result.ok) {
			expect(result.value.marks).toEqual([
				{ text: 'Ela', ok: true },
				{ text: 'trabalha', ok: true },
				{ text: 'ontem', ok: false }
			]);
		}
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBeGreaterThan(0);
		expect(result.value.value).toBeLessThan(1);
	});

	it('toRuntime nunca expõe accepted nem separa token de distrator', () => {
		const runtime = assemble.toRuntime(payload, seed);
		const serialized = JSON.stringify(runtime);
		expect(serialized).not.toContain('accepted');
		expect(serialized).not.toContain('distractors');
		expect(Object.keys(runtime).sort()).toEqual(['tokens', 'translation']);
		// Todo token compartilha o mesmo prefixo de id: nada no payload diz
		// quais dos cinco são os três verdadeiros.
		expect(runtime.tokens.every((t) => /^tk\d+$/.test(t.id))).toBe(true);
		expect(runtime.tokens).toHaveLength(5);
	});

	it('funciona com japonês (sem espaço entre palavras)', () => {
		const ja: AssemblePayload = {
			tokens: ['私', 'は', '学生', 'です'],
			distractors: ['先生'],
			accepted: [['私', 'は', '学生', 'です']]
		};
		const answer = { sequence: ids(['私', 'は', '学生', 'です'], ja, 'seed-ja') };
		expect(assemble.grade(ja, answer, jaJP, 'seed-ja')).toEqual({ ok: true, value: { value: 1 } });
	});

	it('aceita a forma decomposta do diacrítico (pt-BR)', () => {
		const comAcento: AssemblePayload = {
			tokens: ['ele', 'está', 'aqui'],
			distractors: [],
			accepted: [['ele', 'está'.normalize('NFD'), 'aqui']] // gabarito gravado decomposto
		};
		const answer = { sequence: ids(['ele', 'está', 'aqui'], comAcento, seed) };
		expect(assemble.grade(comAcento, answer, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});
});
