import { describe, expect, it } from 'vitest';
import { diaEMes, duracao, haQuantoTempo, ordinal } from './tempo';

describe('duracao', () => {
	it.each([
		[0, '0 s'],
		[1_000, '1 s'],
		[21_000, '21 s'],
		[59_400, '59 s'],
		[60_000, '1 min'],
		[62_000, '1 min 02 s'],
		[622_000, '10 min 22 s'],
		[3_600_000, '60 min']
	])('%i ms → %s', (ms, esperado) => {
		expect(duracao(ms)).toBe(esperado);
	});

	// Uma questão de escolha leva 20 s: arredondar para "0 min" apagaria o dado.
	it('não engole os segundos de uma questão curta', () => {
		expect(duracao(20_000)).toBe('20 s');
	});

	it('não quebra com tempo negativo nem com lixo', () => {
		expect([duracao(-5_000), duracao(Number.NaN)]).toEqual(['0 s', '0 s']);
	});
});

describe('haQuantoTempo', () => {
	const agora = new Date('2026-09-23T12:00:00Z');
	const atras = (ms: number) => new Date(agora.getTime() - ms);

	it.each([
		['há minutos', 5 * 60_000],
		['há 3h', 3 * 3_600_000],
		['ontem', 24 * 3_600_000],
		['há 3 dias', 3 * 24 * 3_600_000],
		['há 1 semana', 7 * 24 * 3_600_000],
		['há 3 semanas', 21 * 24 * 3_600_000]
	])('%s', (esperado, ms) => {
		expect(haQuantoTempo(atras(ms), agora)).toBe(esperado);
	});
});

describe('diaEMes e ordinal', () => {
	it('escreve o dia e o mês por extenso', () => {
		expect(diaEMes(new Date(2026, 8, 14))).toBe('14 de setembro');
	});

	it('numera a tentativa', () => {
		expect([ordinal(1), ordinal(2)]).toEqual(['1ª', '2ª']);
	});
});
