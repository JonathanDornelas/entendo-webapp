import { describe, expect, it } from 'vitest';
import { inicioDoCiclo, proximoCiclo } from './ciclo';

const d = (iso: string) => new Date(iso);

describe('ciclo mensal dos créditos', () => {
	it('ancorado no dia da ativação, não no dia 1º', () => {
		const ancora = d('2026-03-20T10:00:00Z');
		expect(inicioDoCiclo(ancora, d('2026-05-25T00:00:00Z')).toISOString()).toBe(
			'2026-05-20T10:00:00.000Z'
		);
		expect(inicioDoCiclo(ancora, d('2026-05-19T23:00:00Z')).toISOString()).toBe(
			'2026-04-20T10:00:00.000Z'
		);
		expect(proximoCiclo(ancora, d('2026-05-25T00:00:00Z')).toISOString()).toBe(
			'2026-06-20T10:00:00.000Z'
		);
	});

	it('âncora no dia 31 cai no último dia dos meses curtos — fevereiro não pula', () => {
		const ancora = d('2026-01-31T12:00:00Z');
		expect(inicioDoCiclo(ancora, d('2026-02-28T13:00:00Z')).toISOString()).toBe(
			'2026-02-28T12:00:00.000Z'
		);
		expect(inicioDoCiclo(ancora, d('2026-03-15T00:00:00Z')).toISOString()).toBe(
			'2026-02-28T12:00:00.000Z'
		);
		expect(inicioDoCiclo(ancora, d('2026-03-31T12:00:00Z')).toISOString()).toBe(
			'2026-03-31T12:00:00.000Z'
		);
		expect(proximoCiclo(ancora, d('2026-02-28T13:00:00Z')).toISOString()).toBe(
			'2026-03-31T12:00:00.000Z'
		);
	});

	it('atravessa a virada de ano', () => {
		const ancora = d('2026-11-10T00:00:00Z');
		expect(inicioDoCiclo(ancora, d('2027-01-12T00:00:00Z')).toISOString()).toBe(
			'2027-01-10T00:00:00.000Z'
		);
	});

	it('antes da âncora vale o primeiro ciclo', () => {
		const ancora = d('2026-06-01T00:00:00Z');
		expect(inicioDoCiclo(ancora, d('2026-05-01T00:00:00Z')).toISOString()).toBe(
			ancora.toISOString()
		);
	});
});
