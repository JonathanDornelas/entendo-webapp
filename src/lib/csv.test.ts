import { describe, expect, it } from 'vitest';
import { montarCsv, nomeDeArquivo } from './csv';

describe('csv', () => {
	it('escapa aspas, usa ; e começa com BOM', () => {
		const csv = montarCsv(
			['nome', 'nota'],
			[
				['Ana "Aninha"', 90],
				[null, undefined]
			]
		);
		expect(csv.charCodeAt(0) === 0xfeff).toBe(true);
		expect(csv.slice(1).split('\r\n')).toEqual(['"nome";"nota"', '"Ana ""Aninha""";"90"', '"";""']);
	});

	it('nome de arquivo sem acento nem símbolo', () => {
		expect(nomeDeArquivo('Present perfect — turma B')).toBe('present-perfect-turma-b');
		expect(nomeDeArquivo('日本語 1')).toBe('日本語-1');
		expect(nomeDeArquivo('!!!')).toBe('resultados');
	});
});
