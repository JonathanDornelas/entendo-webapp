import { describe, expect, it } from 'vitest';
import { normalize } from './normalize';
import { tokenize } from './tokenize';
import { getProfile } from './profiles';

/**
 * A correção, idioma por idioma — o que cada ESCRITA exige do normalizador.
 *
 * `normalize.test.ts` cobre o mecanismo; este arquivo cobre a decisão. Cada
 * bloco é a armadilha daquela língua, e o critério é sempre o mesmo: duas
 * palavras DIFERENTES não podem comparar iguais, e a mesma palavra escrita de
 * duas formas legítimas tem de comparar igual.
 *
 * O `diacritics` do profile é o botão que decide isso, e ele erra fácil: o valor
 * certo para o inglês (`tolerant`, onde o acento é enfeite de empréstimo) é
 * destrutivo em japonês e em híndi, onde a marca combinante FAZ a palavra.
 */

const igual = (tag: string, a: string, b: string) => {
	const profile = getProfile(tag);
	return normalize(a, profile) === normalize(b, profile);
};
const comoFica = (tag: string, texto: string) => normalize(texto, getProfile(tag));

describe('japonês — o dakuten faz a palavra', () => {
	/**
	 * REGRESSÃO. O profile nascera `diacritics: 'tolerant'`, e `tolerant` descarta
	 * marca combinante: o dakuten é exatamente isso na decomposição. O efeito era
	 * `が` virar `か`, e `ば`/`ぱ` virarem as duas `は` — palavras diferentes
	 * comparando iguais, ou seja aluno aprovado escrevendo outra palavra.
	 *
	 * Nenhum destes casos pode voltar a passar.
	 */
	it.each([
		['が', 'か', 'ga contra ka'],
		['ば', 'ぱ', 'ba contra pa'],
		['ば', 'は', 'ba contra ha'],
		['ぱ', 'は', 'pa contra ha'],
		['がっこう', 'かっこう', 'escola contra aparência'],
		['ガ', 'カ', 'o mesmo em katakana'],
		['でんき', 'てんき', 'eletricidade contra tempo']
	])('%s não é %s (%s)', (a, b) => {
		expect(igual('ja-JP', a, b)).toBe(false);
	});

	// Regra inviolável nº 6 continua valendo: o NFKC compõe as duas formas antes
	// de qualquer comparação, e é isso que `significant` NÃO atrapalha.
	it('a forma composta e a decomposta do mesmo kana são iguais', () => {
		expect(igual('ja-JP', 'が'.normalize('NFC'), 'が'.normalize('NFD'))).toBe(true);
	});

	// O que o japonês realmente precisa do NFKC: meia largura vira largura cheia.
	it('katakana de meia largura vira o de largura cheia', () => {
		expect(igual('ja-JP', 'ｶﾞｯｺｳ', 'ガッコウ')).toBe(true);
	});

	it('não tem espaço para tokenizar — quem separa é o Intl.Segmenter', () => {
		const frase = '私は学生です';
		expect(frase.split(' ')).toHaveLength(1);
		expect(tokenize(frase, getProfile('ja-JP')).length).toBeGreaterThan(1);
	});
});

describe('híndi — a matra e o virama fazem a palavra', () => {
	/**
	 * Mesmo motivo do japonês, com um agravante: o devanágari MISTURA as
	 * categorias Unicode. `ि` (i curto) é marca com espaço e sobreviveria a
	 * `tolerant`; `ु` (u curto) é sem espaço e não. O estrago seria SELETIVO —
	 * algumas vogais somem, outras não —, que é o pior tipo de bug para achar.
	 */
	it.each([
		['कु', 'क', 'ku contra ka'],
		['की', 'कि', 'kī contra ki'],
		['हिन्दी', 'हिनदी', 'com e sem o virama'],
		['किताब', 'कताब', 'livro contra não-palavra']
	])('%s não é %s (%s)', (a, b) => {
		expect(igual('hi-IN', a, b)).toBe(false);
	});

	it('a palavra atravessa o normalizador inteira', () => {
		expect(comoFica('hi-IN', 'हिन्दी')).toBe('हिन्दी');
		expect(comoFica('hi-IN', 'किताब')).toBe('किताब');
	});

	// O dígito devanágari e o arábico são o mesmo número, e o NFKC não converte
	// um no outro — quem fecha isso é o grupo de equivalência do profile.
	it('o dígito devanágari e o arábico são o mesmo número', () => {
		expect(igual('hi-IN', '५', '5')).toBe(true);
		expect(igual('hi-IN', 'पाँच', '5')).toBe(true);
	});
});

describe('chinês — o tom do pinyin é fonêmico', () => {
	// Em han os dois valores de `diacritics` dariam no mesmo; o que decide é o
	// PINYIN, onde o tom distingue palavras (não é sotaque).
	it.each([
		['nǐ', 'ní'],
		['nǐ', 'ni'],
		['mā', 'mà']
	])('%s não é %s', (a, b) => {
		expect(igual('zh-CN', a, b)).toBe(false);
	});

	it('a frase em han atravessa inteira', () => {
		expect(comoFica('zh-CN', '我是学生')).toBe('我是学生');
	});

	it('não tem espaço para tokenizar', () => {
		const frase = '我是学生';
		expect(frase.split(' ')).toHaveLength(1);
		expect(tokenize(frase, getProfile('zh-CN')).length).toBeGreaterThan(1);
	});
});

describe('francês — o acento distingue palavras', () => {
	it.each([
		['ou', 'où', 'ou contra onde'],
		['a', 'à', 'tem contra para'],
		['sur', 'sûr', 'sobre contra certo'],
		['ça', 'ca', 'a cedilha também'],
		['des', 'dès', 'dos contra desde']
	])('%s não é %s (%s)', (a, b) => {
		expect(igual('fr-FR', a, b)).toBe(false);
	});

	it('a forma composta e a decomposta do mesmo acento são iguais', () => {
		expect(igual('fr-FR', 'où'.normalize('NFC'), 'où'.normalize('NFD'))).toBe(true);
	});

	// O hífen cai no `strip-punct` SEM virar espaço: é por isso que as formas do
	// profile estão coladas (ver `fr-FR.ts`).
	it('o numeral hifenizado bate com o dígito', () => {
		expect(igual('fr-FR', 'dix-sept', '17')).toBe(true);
		expect(igual('fr-FR', 'dix sept', '17')).toBe(true);
		expect(igual('fr-FR', 'quatre-vingt-dix', '90')).toBe(true);
	});

	it('o composto com "et" bate com o dígito', () => {
		expect(igual('fr-FR', 'vingt et un', '21')).toBe(true);
	});
});

describe('italiano — o acento distingue palavras', () => {
	it.each([
		['e', 'è', 'e contra é'],
		['la', 'là', 'a contra lá'],
		['si', 'sì', 'se contra sim']
	])('%s não é %s (%s)', (a, b) => {
		expect(igual('it-IT', a, b)).toBe(false);
	});

	// A dezena perde a vogal antes de "uno" e "otto" — as duas formas contam.
	it('o composto bate com o dígito', () => {
		expect(igual('it-IT', 'ventuno', '21')).toBe(true);
		expect(igual('it-IT', 'ventidue', '22')).toBe(true);
		expect(igual('it-IT', 'ventotto', '28')).toBe(true);
	});
});

describe('espanhol e português — acento significativo', () => {
	it('o acento não é opcional', () => {
		expect(igual('es-ES', 'esta', 'está')).toBe(false);
		expect(igual('pt-BR', 'esta', 'está')).toBe(false);
		expect(igual('pt-BR', 'avo', 'avô')).toBe(false);
	});

	it('mas a forma composta e a decomposta são iguais', () => {
		expect(igual('pt-BR', 'está'.normalize('NFC'), 'está'.normalize('NFD'))).toBe(true);
	});

	it('as formas intercambiáveis do futuro são a mesma resposta', () => {
		expect(igual('pt-BR', 'ela vai trabalhar', 'ela irá trabalhar')).toBe(true);
	});

	it('o numeral por extenso bate com o dígito', () => {
		expect(igual('pt-BR', 'vinte e um', '21')).toBe(true);
		expect(igual('es-ES', 'veintiuno', '21')).toBe(true);
		expect(igual('es-ES', 'treinta y dos', '32')).toBe(true);
	});
});

describe('inglês — as duas variantes corrigem igual', () => {
	it.each(['en-US', 'en-GB'])('%s: o acento de empréstimo é tolerado', (tag) => {
		expect(igual(tag, 'café', 'cafe')).toBe(true);
		expect(igual(tag, 'naïve', 'naive')).toBe(true);
	});

	it.each(['en-US', 'en-GB'])('%s: a caixa não conta', (tag) => {
		expect(igual(tag, 'Hello There', 'hello there')).toBe(true);
	});

	it.each(['en-US', 'en-GB'])('%s: a contração é a forma cheia', (tag) => {
		expect(igual(tag, "I'm late", 'I am late')).toBe(true);
		expect(igual(tag, "don't", 'do not')).toBe(true);
	});

	it.each(['en-US', 'en-GB'])('%s: o numeral por extenso bate com o dígito', (tag) => {
		expect(igual(tag, 'seven', '7')).toBe(true);
		expect(igual(tag, 'twenty-one', '21')).toBe(true);
	});

	// A contração cuja forma sem apóstrofo é OUTRA palavra fica fora da lista de
	// propósito: igualá-las apagaria uma distinção real.
	it.each(['en-US', 'en-GB'])('%s: "were" não é "we are"', (tag) => {
		expect(igual(tag, 'were', 'we are')).toBe(false);
	});

	// A ortografia que difere de verdade NÃO é equivalência: dizer que "color"
	// está certo em inglês britânico é o oposto do que a atividade ensina.
	it('colour e color continuam respostas diferentes nas duas variantes', () => {
		expect(igual('en-GB', 'colour', 'color')).toBe(false);
		expect(igual('en-US', 'colour', 'color')).toBe(false);
	});
});

describe('árabe — o tashkeel é opcional na escrita', () => {
	// Aqui `tolerant` é o valor CERTO: as marcas de vogal são normalmente
	// omitidas no dia a dia, e exigi-las reprovaria a escrita corrente.
	it('a palavra com e sem as marcas de vogal é a mesma', () => {
		expect(igual('ar-SA', 'كِتَاب', 'كتاب')).toBe(true);
	});

	it('mas continuam palavras diferentes quando as consoantes diferem', () => {
		expect(igual('ar-SA', 'كتاب', 'كتب')).toBe(false);
	});
});

describe('o que vale em todo idioma', () => {
	const todos = [
		'pt-BR',
		'es-ES',
		'en-US',
		'en-GB',
		'fr-FR',
		'it-IT',
		'hi-IN',
		'zh-CN',
		'ja-JP',
		'ar-SA'
	];

	// Espaço a mais nunca é erro de idioma — dois toques na barra, o espaço que
	// sobra depois de `strip-punct` comer uma vírgula, o espaço do teclado do
	// celular. Vale até onde não há espaço nenhum para colapsar.
	it.each(todos)('%s: espaço repetido e nas pontas não conta', (tag) => {
		expect(igual(tag, '  a   b  ', 'a b')).toBe(true);
	});

	it.each(todos)('%s: normalizar duas vezes dá o mesmo (idempotente)', (tag) => {
		const profile = getProfile(tag);
		for (const texto of ['Olá, mundo!', 'がっこう', 'हिन्दी', '我是学生', 'où est-il ?', '7']) {
			const uma = normalize(texto, profile);
			expect(normalize(uma, profile)).toBe(uma);
		}
	});

	it.each(todos)('%s: texto vazio não explode', (tag) => {
		expect(() => comoFica(tag, '')).not.toThrow();
	});
});
