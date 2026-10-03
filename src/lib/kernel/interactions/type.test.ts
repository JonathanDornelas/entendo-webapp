import { describe, expect, it } from 'vitest';
import { type, type TypePayload } from './type';
import { ptBR } from '../language/profiles/pt-BR';
import { jaJP } from '../language/profiles/ja-JP';

const seed = 'attempt-seed-1';

describe('type', () => {
	const payload: TypePayload = { accepted: ['Ela trabalha aqui desde 2019.'] };

	it('pontua a resposta certa', () => {
		const result = type.grade(payload, { text: 'Ela trabalha aqui desde 2019.' }, ptBR, seed);
		expect(result).toEqual({ ok: true, value: { value: 1 } });
	});

	it('pontua a resposta errada', () => {
		const result = type.grade(payload, { text: 'Nada a ver com a frase' }, ptBR, seed);
		expect(result.ok && result.value.value).toBe(0);
	});

	// A "quase certa" é a que pega bug: uma letra a menos precisa virar
	// PARCIAL, não zero seco.
	it('dá parcial para a resposta quase certa', () => {
		const result = type.grade(payload, { text: 'Ela trabalha aqui desde 201.' }, ptBR, seed);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.value).toBeGreaterThan(0);
		expect(result.value.value).toBeLessThan(1);
		expect(result.value.feedback).toBeTruthy();
	});

	it('toRuntime nunca expõe accepted', () => {
		const runtime = type.toRuntime(payload, seed);
		expect(JSON.stringify(runtime)).not.toContain('accepted');
		expect(JSON.stringify(runtime)).not.toContain('trabalha');
		expect(runtime).toEqual({ masked: '' });
	});

	it('aceita resposta em japonês (sem espaço entre palavras)', () => {
		const ja: TypePayload = { accepted: ['私は学生です'] };
		expect(type.grade(ja, { text: '私は学生です' }, jaJP, seed)).toEqual({
			ok: true,
			value: { value: 1 }
		});
	});

	// Regra inviolável nº 6: 'é' pré-composto e 'e' + acento combinante são
	// pontos de código diferentes — sem normalizar, o aluno vê "errado" numa
	// resposta certa.
	it('trata a forma composta e a decomposta do diacrítico como iguais', () => {
		const acentuado: TypePayload = { accepted: ['café'.normalize('NFC')] };
		const result = type.grade(acentuado, { text: 'café'.normalize('NFD') }, ptBR, seed);
		expect(result).toEqual({ ok: true, value: { value: 1 } });
	});

	it('deriva writing sempre, e listening quando o prompt é áudio', () => {
		expect(type.skills({ kind: 'text' })).toEqual(['reading', 'writing']);
		expect(type.skills({ kind: 'audio' })).toEqual(['listening', 'writing']);
	});
});
