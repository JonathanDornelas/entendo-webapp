import { describe, expect, it } from 'vitest';
import { speak, type SpeakPayload } from './speak';
import { ptBR } from '../language/profiles/pt-BR';
import { jaJP } from '../language/profiles/ja-JP';

const seed = 'attempt-seed-1';

describe('speak', () => {
	const payload: SpeakPayload = {
		target: 'Ela trabalha aqui desde 2019.',
		ipa: 'ˈɛlɐ tɾaˈbaʎɐ',
		hints: ['trabalha', '2019']
	};

	it('pontua a fala certa', () => {
		const result = speak.grade(
			payload,
			{ transcript: 'Ela trabalha aqui desde 2019.' },
			ptBR,
			seed
		);
		expect(result).toEqual({ ok: true, value: { value: 1 } });
	});

	// kernel.md "Correção": speak NUNCA reprova de forma dura — ASR erra muito
	// com sotaque não-nativo, que é exatamente o público.
	it('nunca zera, mesmo com a transcrição completamente errada', () => {
		const result = speak.grade(payload, { transcript: 'xyz abc' }, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBeGreaterThan(0);
		expect(result.value.value).toBeLessThan(1);
	});

	it('dá parcial e aponta a palavra que faltou na fala quase certa', () => {
		const result = speak.grade(payload, { transcript: 'Ela trabalha desde 2019.' }, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBeLessThan(1);
		expect(result.value.feedback).toContain('aqui');
	});

	it('toRuntime expõe só o que o aluno precisa ver, nunca as hints do ASR', () => {
		const runtime = speak.toRuntime(payload, seed);
		expect(runtime).toEqual({ target: 'Ela trabalha aqui desde 2019.', ipa: 'ˈɛlɐ tɾaˈbaʎɐ' });
		expect(JSON.stringify(runtime)).not.toContain('hints');
	});

	it('funciona com japonês (sem espaço entre palavras)', () => {
		const ja: SpeakPayload = { target: '私は学生です', hints: [] };
		expect(speak.grade(ja, { transcript: '私は学生です' }, jaJP, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('trata a forma composta e a decomposta do diacrítico como iguais', () => {
		const acentuado: SpeakPayload = { target: 'café'.normalize('NFC'), hints: [] };
		expect(speak.grade(acentuado, { transcript: 'café'.normalize('NFD') }, ptBR, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	it('deriva speaking', () => {
		expect(speak.skills({ kind: 'text' })).toContain('speaking');
	});
});
