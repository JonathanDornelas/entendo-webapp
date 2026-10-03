import { describe, expect, it } from 'vitest';
import { leituraDoTexto } from './leitura';
import { arabe, devanagari, kana } from './teclados';

/**
 * A linha "Leitura" sob o campo. Não corrige nada — mas se ela mentir, o aluno
 * confere a pronúncia errada e acha que tocou a letra certa. Os casos são os
 * que uma tradução caractere a caractere erra.
 */

describe('kana', () => {
	it.each([
		['おはよう', 'ohayou'],
		['すし', 'sushi'],
		// っ pequeno dobra a consoante seguinte.
		['がっこう', 'gakkou'],
		['きって', 'kitte'],
		// Sílaba contraída: uma sílaba, não duas.
		['きょう', 'kyou'],
		['しゃしん', 'shashin'],
		['ちゃ', 'cha'],
		['じゅう', 'juu'],
		// Katakana lê igual, e a barra alonga a vogal anterior.
		['コーヒー', 'koohii'],
		['ラーメン', 'raamen']
	])('%s → %s', (texto, leitura) => {
		expect(leituraDoTexto(kana, texto)).toBe(leitura);
	});

	it('o que não é kana passa como está', () => {
		expect(leituraDoTexto(kana, 'すし 2')).toBe('sushi 2');
	});
});

describe('devanágari', () => {
	it.each([
		// A consoante carrega um "a"...
		['क', 'ka'],
		['कल', 'kala'],
		// ...que a matra substitui...
		['कि', 'ki'],
		['की', 'kī'],
		// ...e que o virama apaga.
		['नमस्ते', 'namaste'],
		// Anusvara depois da vogal, não no lugar dela.
		['हिंदी', 'hiṃdī'],
		// Vogal independente é a própria vogal.
		['आम', 'āma']
	])('%s → %s', (texto, leitura) => {
		expect(leituraDoTexto(devanagari, texto)).toBe(leitura);
	});
});

describe('árabe', () => {
	// Transliteração de consulta, letra a letra: o árabe não escreve as vogais
	// curtas, e inventá-las seria afirmar uma pronúncia que o texto não diz.
	it('lê letra a letra', () => {
		expect(leituraDoTexto(arabe, 'شكرا')).toBe('shkra');
	});
});
