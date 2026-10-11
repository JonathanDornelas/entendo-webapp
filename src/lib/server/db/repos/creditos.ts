import { prisma, type Db } from '$lib/server/db/client';

type TeacherScope = { id: string };

export type MotivoDeCredito = 'geracao_ia' | 'estorno' | 'cortesia' | 'ajuste';

/**
 * O livro-razão de créditos de IA do professor — só lançamentos, escopados por
 * `teacherId` (regra inviolável nº 4). Ver `CreditEntry` no schema e
 * docs/adr-003-ia-gemini.md.
 *
 * Gastar e devolver acontecem sob a trava por professor
 * (`$lib/server/billing/creditos.ts`), por isso aceitam a transação.
 */
export function creditos(teacher: TeacherScope, db: Db = prisma) {
	return {
		/** Soma dos lançamentos do ciclo — o saldo é a franquia do plano mais isto. */
		async somaDoCiclo(cicloInicio: Date): Promise<number> {
			const { _sum } = await db.creditEntry.aggregate({
				where: { teacherId: teacher.id, cicloInicio },
				_sum: { delta: true }
			});
			return _sum.delta ?? 0;
		},

		/** O lançamento com esta chave, se já existe — é o que torna cada movimento idempotente. */
		porChave(refKey: string) {
			return db.creditEntry.findFirst({
				where: { teacherId: teacher.id, refKey },
				select: { id: true, delta: true, cicloInicio: true }
			});
		},

		lancar(entrada: { delta: number; motivo: MotivoDeCredito; refKey: string; cicloInicio: Date }) {
			return db.creditEntry.create({ data: { ...entrada, teacherId: teacher.id } });
		}
	};
}
