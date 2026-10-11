import { describe, expect, it } from 'vitest';
import {
	diaEmBrasilia,
	diaPorExtenso,
	gradeDoMes,
	horaEmBrasilia,
	nomeDoMes,
	porDia,
	proximosDias,
	somarMesesAoMes,
	type EventoDeEnvio
} from './agenda';

function evento(over: Partial<EventoDeEnvio> & { dia: string }): EventoDeEnvio {
	return {
		id: `${over.alocacaoId ?? 'a1'}:${over.atividade?.id ?? 'x'}`,
		alocacaoId: 'a1',
		hora: '8h',
		estado: 'programada',
		motivo: null,
		emails: 22,
		porEmail: true,
		modulo: { id: 'm1', nome: 'Frutas', cor: 'violeta', sigla: 'FR' },
		turma: { id: 't1', nome: '7º B — inglês', cor: 'violeta', sigla: '7B' },
		atividade: { id: 'x', titulo: 'Frutas 1' },
		...over
	};
}

describe('agenda', () => {
	it('o dia e a hora são os de Brasília', () => {
		// 01h UTC do dia 16 ainda é 22h do dia 15 em Brasília.
		const d = new Date('2026-10-16T01:00:00Z');
		expect(diaEmBrasilia(d)).toBe('2026-10-15');
		expect(horaEmBrasilia(d)).toBe('22h');
		expect(horaEmBrasilia(new Date('2026-10-15T10:30:00Z'))).toBe('7h30');
	});

	it('escreve dia, mês e soma meses na virada do ano', () => {
		expect(diaPorExtenso('2026-10-12')).toBe('segunda, 12 de outubro');
		expect(nomeDoMes('2026-10')).toBe('Outubro de 2026');
		expect(somarMesesAoMes('2026-12', 1)).toBe('2027-01');
		expect(somarMesesAoMes('2026-01', -1)).toBe('2025-12');
	});

	it('próximos 7 dias: um cartão por turma por dia, só o que ainda vai sair', () => {
		const eventos = [
			evento({ dia: '2026-10-12', atividade: { id: 'a', titulo: 'Frutas 1' } }),
			evento({
				dia: '2026-10-12',
				atividade: { id: 'b', titulo: 'Frutas 2' },
				estado: 'rascunho'
			}),
			evento({ dia: '2026-10-12', alocacaoId: 'a2', atividade: { id: 'a', titulo: 'Frutas 1' } }),
			evento({ dia: '2026-10-10', estado: 'enviada' }),
			evento({ dia: '2026-10-20' })
		];
		const semana = proximosDias(eventos, '2026-10-09');
		expect(semana).toHaveLength(7);
		expect(semana[0]).toMatchObject({ rotulo: 'hoje', data: '09/10', hoje: true, envios: [] });
		expect(semana[1].envios).toEqual([]); // a enviada não entra
		const seg = semana[3];
		expect(seg.rotulo).toBe('seg');
		expect(seg.envios).toHaveLength(2);
		expect(seg.envios[0]).toMatchObject({ titulo: 'Frutas 1 +1', rascunho: true });
		expect(seg.envios[1]).toMatchObject({ titulo: 'Frutas 1', rascunho: false });
	});

	it('o mês começa na segunda e fecha semanas inteiras', () => {
		const eventos = [evento({ dia: '2026-10-15' })];
		const grade = gradeDoMes('2026-10', porDia(eventos), '2026-10-09');
		// 1º de outubro de 2026 é quinta: a grade abre na segunda, 28 de setembro.
		expect(grade[0]).toMatchObject({ dia: '2026-09-28', fora: true });
		expect(grade).toHaveLength(35);
		expect(grade.find((c) => c.hoje)?.dia).toBe('2026-10-09');
		expect(grade.find((c) => c.dia === '2026-10-15')?.eventos).toHaveLength(1);
		expect(grade.at(-1)).toMatchObject({ dia: '2026-11-01', fora: true });
	});
});
