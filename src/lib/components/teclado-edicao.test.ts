import { describe, expect, it } from 'vitest';
import { apagar, inserir, trocarAnterior } from './teclado-edicao';

describe('inserir', () => {
	it('insere no cursor, não no fim', () => {
		// "abc|def" — o aluno voltou para o meio da palavra.
		expect(inserir('abcdef', 3, 3, 'X')).toEqual({ valor: 'abcXdef', cursor: 4 });
	});

	it('substitui a seleção', () => {
		expect(inserir('abcdef', 1, 4, 'Z')).toEqual({ valor: 'aZef', cursor: 2 });
	});

	it('aceita seleção de trás para a frente', () => {
		expect(inserir('abcdef', 4, 1, 'Z')).toEqual({ valor: 'aZef', cursor: 2 });
	});

	it('põe no fim quando o cursor está no fim', () => {
		expect(inserir('كتا', 3, 3, 'ب')).toEqual({ valor: 'كتاب', cursor: 4 });
	});

	it('pendura a matra na consoante anterior', () => {
		// क + ि = कि — a matra entra depois da consoante no texto, e é a fonte
		// que a desenha antes. O teclado só insere o ponto de código.
		expect(inserir('क', 1, 1, 'ि')).toEqual({ valor: 'कि', cursor: 2 });
	});

	it('recusa inteira a inserção que estouraria o limite', () => {
		expect(inserir('abc', 3, 3, 'de', 4)).toEqual({ valor: 'abc', cursor: 3 });
	});

	it('não quebra com posição fora do texto', () => {
		expect(inserir('abc', 99, 99, 'X')).toEqual({ valor: 'abcX', cursor: 4 });
		expect(inserir('abc', -5, -5, 'X')).toEqual({ valor: 'Xabc', cursor: 1 });
	});
});

describe('apagar', () => {
	it('apaga o caractere antes do cursor', () => {
		expect(apagar('abcdef', 3, 3)).toEqual({ valor: 'abdef', cursor: 2 });
	});

	it('apaga a seleção inteira', () => {
		expect(apagar('abcdef', 1, 4)).toEqual({ valor: 'aef', cursor: 1 });
	});

	it('no começo não faz nada', () => {
		expect(apagar('abc', 0, 0)).toEqual({ valor: 'abc', cursor: 0 });
	});

	// Quem errou a vogal quer trocar a matra, não perder a consoante — é assim
	// que todo teclado índico apaga.
	it('em devanágari apaga a matra e deixa a consoante', () => {
		expect(apagar('कि', 2, 2)).toEqual({ valor: 'क', cursor: 1 });
	});

	it('em árabe apaga uma letra', () => {
		expect(apagar('كتاب', 4, 4)).toEqual({ valor: 'كتا', cursor: 3 });
	});

	// Um caractere fora do plano básico ocupa duas unidades UTF-16; apagar uma só
	// deixaria meia letra inválida no campo.
	it('não parte um par substituto ao meio', () => {
		const emoji = 'a😀';
		expect(apagar(emoji, emoji.length, emoji.length)).toEqual({ valor: 'a', cursor: 1 });
	});
});

// A tecla que age na letra anterior: o ゛ do kana.
describe('trocarAnterior', () => {
	const dakuten = { か: 'が', が: 'か' };

	it('troca a letra antes do cursor, e não a do fim', () => {
		// がっこう com o cursor depois do か, digitado sem o ゛: かっこう → がっこう.
		expect(trocarAnterior('かっこう', 1, 1, dakuten)).toEqual({ valor: 'がっこう', cursor: 1 });
	});

	it('tocar de novo desfaz', () => {
		expect(trocarAnterior('が', 1, 1, dakuten)).toEqual({ valor: 'か', cursor: 1 });
	});

	it('letra que o mapa não conhece fica como está', () => {
		expect(trocarAnterior('あ', 1, 1, dakuten)).toEqual({ valor: 'あ', cursor: 1 });
	});

	it('no começo do campo não há o que trocar', () => {
		expect(trocarAnterior('か', 0, 0, dakuten)).toEqual({ valor: 'か', cursor: 0 });
	});

	it('com seleção, age na última letra dela e desfaz a seleção', () => {
		expect(trocarAnterior('かか', 0, 2, dakuten)).toEqual({ valor: 'かが', cursor: 2 });
	});
});
