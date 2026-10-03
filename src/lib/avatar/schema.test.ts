import { describe, expect, it } from 'vitest';
import { codigoDeAvatarSchema } from './schema';
import { CASAS, CODIGO_PADRAO } from './montar';

/**
 * A fronteira de validação do avatar. Ela existe porque `montarAvatar` aguentar
 * entrada podre não é motivo para GRAVAR entrada podre: o que vai ao banco é
 * sempre a forma canônica, senão dois avatares iguais ficam com texto diferente.
 *
 * Toda remote function é endpoint HTTP público (regra nº 3), então o que chega
 * aqui é `unknown` de verdade — não o que a tela mandaria.
 */
describe('codigoDeAvatarSchema', () => {
	it('aceita o código padrão e devolve as dezoito casas', () => {
		const saida = codigoDeAvatarSchema.parse(CODIGO_PADRAO);
		expect(saida.split('-')).toHaveLength(CASAS);
	});

	it('normaliza: completa as casas que faltam', () => {
		expect(codigoDeAvatarSchema.parse('2-3')).toBe('2-3-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0');
	});

	it('normaliza: traz para dentro do limite em vez de recusar', () => {
		// 99 cabelos não existem; o valor dá a volta na normalização.
		const saida = codigoDeAvatarSchema.parse('0-99-0-0-0-0-0-0-0-0-0-0-0-0-0-0');
		expect(saida.split('-')[1]).toBe('3');
	});

	it('apara espaço em volta', () => {
		expect(codigoDeAvatarSchema.parse(`  ${CODIGO_PADRAO}  `)).toBe(
			codigoDeAvatarSchema.parse(CODIGO_PADRAO)
		);
	});

	it.each([
		['vazio', ''],
		['letras', 'a-b-c'],
		['vírgula no lugar do hífen', '1,2,3'],
		['decimal', '1.5-2'],
		['negativo', '-1-2'],
		['casas demais', new Array(30).fill(1).join('-')],
		['número absurdo', '99999-1-1'],
		['injeção de texto', '1-1-1\'; drop table "Teacher"; --'],
		['espaço no meio', '1- 1-1'],
		['hífen dobrado', '1--1'],
		['só hífens', '---'],
		['longo demais', new Array(60).fill(123).join('-')]
	])('recusa entrada inválida: %s', (_caso, entrada) => {
		expect(codigoDeAvatarSchema.safeParse(entrada).success).toBe(false);
	});

	it.each([
		['número', 42],
		['nulo', null],
		['objeto', { codigo: '1-1' }],
		['lista', [1, 2, 3]],
		['booleano', true]
	])('recusa o que não é string: %s', (_caso, entrada) => {
		expect(codigoDeAvatarSchema.safeParse(entrada).success).toBe(false);
	});

	it('o que passa é sempre idempotente sob nova validação', () => {
		const uma = codigoDeAvatarSchema.parse('4-11-8-7-4-6-5-5-3-2-15-7-6-12-5-11-3-9');
		expect(codigoDeAvatarSchema.parse(uma)).toBe(uma);
	});
});
