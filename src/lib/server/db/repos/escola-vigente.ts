import { prisma, type Db } from '$lib/server/db/client';
import type { EscolaEmVigor } from '$lib/server/billing/entitlements';

type TeacherScope = { id: string };

/**
 * A escola cujo contrato vale para este professor AGORA, se houver — ela VENCE
 * o plano próprio enquanto vale (docs/adr-005-escola.md).
 *
 * Vale quando: o professor é membro, a escola está `ativa` e o contrato não
 * venceu. Escola suspensa, encerrada ou vencida não vale — o membro volta ao
 * próprio plano (ou ao trial vencido) sem perder nada: nenhum link sai do ar.
 *
 * O limite de cada recurso é a EXCEÇÃO do membro, se o admin definiu uma, ou o
 * padrão da escola. `desde` é a entrada na escola — ela ancora o ciclo mensal
 * dos créditos.
 */
export async function escolaEmVigor(
	teacher: TeacherScope,
	db: Db = prisma,
	agora: Date = new Date()
): Promise<(EscolaEmVigor & { desde: Date }) | null> {
	const membro = await db.schoolMembership.findUnique({
		where: { teacherId: teacher.id },
		include: { school: true }
	});
	if (!membro) return null;
	const { school } = membro;
	if (school.status !== 'ativa') return null;
	if (school.contractEndsAt && school.contractEndsAt <= agora) return null;

	const creditos = membro.creditosMax ?? school.creditosPorProfessor;
	return {
		id: school.id,
		nome: school.name,
		desde: membro.createdAt,
		limites: {
			atividades: membro.atividadesMax ?? school.atividadesPorProfessor,
			materiais: membro.materiaisMax ?? school.materiaisPorProfessor,
			creditosPorCiclo: creditos,
			ia: creditos > 0
		}
	};
}
