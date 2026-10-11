import { describe, expect, it } from 'vitest';
import {
	barrasDaSemana,
	descricaoDasBarras,
	rotuloDaSemana,
	saudacao,
	segundaDaSemana
} from './semana';

describe('a semana do início', () => {
	it('começa na segunda, inclusive quando hoje é domingo', () => {
		expect(segundaDaSemana('2026-10-09')).toBe('2026-10-05'); // sexta
		expect(segundaDaSemana('2026-10-05')).toBe('2026-10-05'); // segunda
		expect(segundaDaSemana('2026-10-11')).toBe('2026-10-05'); // domingo
	});

	it('o rótulo repete o mês só quando a semana atravessa dois', () => {
		expect(rotuloDaSemana('2026-10-05')).toBe('seg 05 a dom 11/10');
		expect(rotuloDaSemana('2026-09-28')).toBe('seg 28/09 a dom 04/10');
	});

	const tentativas = {
		'2026-10-05': 9,
		'2026-10-06': 14,
		'2026-10-07': 6,
		'2026-10-08': 21,
		'2026-10-09': 4
	};

	it('sete barras de segunda a domingo, com a altura contra o dia mais movimentado', () => {
		const barras = barrasDaSemana('2026-10-05', '2026-10-09', tentativas, []);
		expect(barras.map((b) => b.rotulo)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']);
		expect(barras.map((b) => b.tentativas)).toEqual([9, 14, 6, 21, 4, 0, 0]);
		expect(barras[3].fracao).toBe(1);
		expect(barras[5]).toMatchObject({ fracao: 0, futuro: true });
		expect(barras[4]).toMatchObject({ hoje: true, futuro: false });
	});

	it('uma marca por barra: hoje vence o pico, o pico vence o envio', () => {
		const barras = barrasDaSemana('2026-10-05', '2026-10-09', tentativas, [
			'2026-10-05',
			'2026-10-08',
			'2026-10-09'
		]);
		expect(barras.map((b) => b.marca)).toEqual(['envio', null, null, 'pico', 'hoje', null, null]);
		// O envio de quinta continua dito, mesmo sem a marca.
		expect(barras[3].comEnvio).toBe(true);
	});

	it('empate não vira duas marcas, e semana vazia não tem dia mais movimentado', () => {
		const empate = barrasDaSemana(
			'2026-10-05',
			'2026-10-11',
			{ '2026-10-06': 5, '2026-10-08': 5 },
			[]
		);
		expect(empate.filter((b) => b.marca === 'pico').map((b) => b.dia)).toEqual(['2026-10-06']);

		const vazia = barrasDaSemana('2026-10-05', '2026-10-07', {}, []);
		expect(vazia.some((b) => b.marca === 'pico')).toBe(false);
		expect(vazia.every((b) => b.fracao === 0)).toBe(true);
	});

	it('o gráfico tem descrição em texto', () => {
		const barras = barrasDaSemana('2026-10-05', '2026-10-09', tentativas, []);
		expect(descricaoDasBarras(barras)).toBe(
			'Tentativas por dia nesta semana: seg 9, ter 14, qua 6, qui 21, sex 4, sáb 0, dom 0'
		);
	});

	it('a saudação segue o relógio de Brasília, não o do servidor', () => {
		expect(saudacao(new Date('2026-10-09T11:59:00-03:00'))).toBe('Bom dia');
		expect(saudacao(new Date('2026-10-09T12:00:00-03:00'))).toBe('Boa tarde');
		expect(saudacao(new Date('2026-10-09T18:00:00-03:00'))).toBe('Boa noite');
		expect(saudacao(new Date('2026-10-09T03:00:00-03:00'))).toBe('Boa noite');
		// 20h30 em UTC são 17h30 em Brasília: ainda é tarde.
		expect(saudacao(new Date('2026-10-09T20:30:00Z'))).toBe('Boa tarde');
	});
});
