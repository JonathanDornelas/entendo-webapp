import { describe, expect, it } from 'vitest';
import { choice, type ChoicePayload } from './choice';
import { ptBR } from '../language/profiles/pt-BR';
import { jaJP } from '../language/profiles/ja-JP';

// Os 4 testes obrigatórios de testing.md. Escolha múltipla corrige por
// índice, não por comparação de string — os testes de idioma aqui provam que
// `toRuntime`/`grade` não quebram com esses scripts, não a normalização em
// si (isso é coberto a fundo em type.test.ts e cloze.test.ts, onde a
// resposta é texto livre de verdade).
describe('choice', () => {
	const payload: ChoicePayload = { options: ['gato', 'cachorro', 'pássaro'], correctIndex: 1 };
	const seed = 'attempt-seed-1';

	function idOf(text: string) {
		const runtime = choice.toRuntime(payload, seed);
		return runtime.options.find((o) => o.text === text)!.id;
	}

	it('pontua a resposta certa', () => {
		expect(choice.grade(payload, { optionId: idOf('cachorro') }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('pontua a resposta errada', () => {
		expect(choice.grade(payload, { optionId: idOf('gato') }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 0 }
		});
	});

	// Escolha múltipla não tem estado parcial de verdade — "quase certa" aqui
	// é o vizinho mais provável de um bug de off-by-one no esquema de ids.
	it('não confunde o vizinho errado com o correto', () => {
		expect(choice.grade(payload, { optionId: idOf('pássaro') }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 0 }
		});
	});

	it('toRuntime nunca expõe correctIndex nem qualquer campo além das opções', () => {
		const runtime = choice.toRuntime(payload, seed);
		expect(JSON.stringify(runtime)).not.toContain('correctIndex');
		expect(Object.keys(runtime)).toEqual(['options']);
	});

	it('funciona com japonês (sem espaço entre palavras)', () => {
		const jaPayload: ChoicePayload = { options: ['猫', '犬', '鳥'], correctIndex: 0 };
		const a = choice.toRuntime(jaPayload, 'seed-ja');
		const b = choice.toRuntime(jaPayload, 'seed-ja');
		expect(a).toEqual(b); // determinístico — regra inviolável nº 8
		const id = a.options.find((o) => o.text === '猫')!.id;
		expect(choice.grade(jaPayload, { optionId: id }, jaJP, 'seed-ja')).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('funciona com opções acentuadas (pt-BR)', () => {
		const p: ChoicePayload = { options: ['café', 'chá'], correctIndex: 0 };
		const id = choice.toRuntime(p, seed).options.find((o) => o.text === 'café')!.id;
		expect(choice.grade(p, { optionId: id }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});
});
