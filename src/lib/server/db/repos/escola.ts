import { prisma } from '$lib/server/db/client';
import { acessoDoProfessor } from '$lib/server/billing/acesso';
import type { CoordenacaoScope } from '$lib/server/escola/guard';

/**
 * O que a COORDENAÇÃO lê da escola — a única leitura entre professores do
 * produto além do painel interno (auth.md "Escola"). Só existe com um
 * `CoordenacaoScope`.
 *
 * **Só números, nunca nome de aluno nem resposta** (decisão do dono do
 * repositório, docs/adr-005-escola.md). Por professor: uso contra o limite,
 * atividades no ar, turmas. Por turma: quantos alunos, envios, quantas
 * tentativas terminaram e o acerto médio. Os DTOs abaixo são explícitos por
 * isso — e só valem para quem é membro AGORA: ex-membro não aparece.
 */
export function escola(scope: CoordenacaoScope) {
	const daEscola = { schoolMembership: { schoolId: scope.schoolId } };

	return {
		async resumo() {
			const s = await prisma.school.findUniqueOrThrow({
				where: { id: scope.schoolId },
				include: { _count: { select: { members: true } } }
			});
			return {
				nome: s.name,
				assentos: s.seats,
				ocupados: s._count.members,
				limites: {
					atividades: s.atividadesPorProfessor,
					materiais: s.materiaisPorProfessor,
					creditos: s.creditosPorProfessor
				},
				contratoAte: s.contractEndsAt
			};
		},

		async professores() {
			const membros = await prisma.schoolMembership.findMany({
				where: { schoolId: scope.schoolId },
				orderBy: { createdAt: 'asc' },
				select: {
					role: true,
					createdAt: true,
					teacher: {
						select: {
							id: true,
							name: true,
							email: true,
							avatar: true,
							_count: { select: { classrooms: true } },
							activities: {
								where: { archivedAt: null, versions: { some: { publications: { some: {} } } } },
								select: { id: true }
							}
						}
					}
				}
			});
			return Promise.all(
				membros.map(async (m) => {
					const estado = await acessoDoProfessor({ id: m.teacher.id });
					return {
						id: m.teacher.id,
						name: m.teacher.name,
						email: m.teacher.email,
						avatar: m.teacher.avatar ?? null,
						role: m.role,
						desde: m.createdAt,
						turmas: m.teacher._count.classrooms,
						noAr: m.teacher.activities.length,
						uso: estado.uso,
						limites: { atividades: estado.limites.atividades, materiais: estado.limites.materiais },
						creditos: { saldo: estado.creditos.saldo, porCiclo: estado.limites.creditosPorCiclo }
					};
				})
			);
		},

		/**
		 * Os números por turma. Nada de aluno: `alunos` é uma CONTAGEM, e o acerto
		 * é a média das respostas de tentativas terminadas por alunos daquela
		 * turma — sem dizer de quem.
		 */
		async turmas() {
			const turmas = await prisma.classroom.findMany({
				where: { teacher: daEscola },
				orderBy: { createdAt: 'desc' },
				select: {
					id: true,
					name: true,
					teacher: { select: { name: true } },
					_count: { select: { students: true, deliveries: true } }
				}
			});
			return Promise.all(
				turmas.map(async (t) => {
					const [terminadas, comecadas, media] = await Promise.all([
						prisma.attempt.count({
							where: { student: { classroomId: t.id }, finishedAt: { not: null } }
						}),
						prisma.attempt.count({ where: { student: { classroomId: t.id } } }),
						prisma.attemptItem.aggregate({
							where: { attempt: { student: { classroomId: t.id }, finishedAt: { not: null } } },
							_avg: { score: true }
						})
					]);
					return {
						id: t.id,
						name: t.name,
						professor: t.teacher.name,
						alunos: t._count.students,
						envios: t._count.deliveries,
						tentativas: comecadas,
						terminadas,
						acertoMedio: media._avg.score === null ? null : Math.round(media._avg.score * 100)
					};
				})
			);
		},

		convitesPendentes() {
			return prisma.schoolInvite.findMany({
				where: { schoolId: scope.schoolId, acceptedAt: null, expiresAt: { gt: new Date() } },
				orderBy: { createdAt: 'desc' },
				select: { id: true, email: true, role: true, expiresAt: true, sentAt: true }
			});
		},

		async revogarConvite(inviteId: string): Promise<boolean> {
			const { count } = await prisma.schoolInvite.deleteMany({
				where: { id: inviteId, schoolId: scope.schoolId, acceptedAt: null }
			});
			return count > 0;
		}
	};
}
