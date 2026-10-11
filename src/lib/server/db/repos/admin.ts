import { prisma } from '$lib/server/db/client';
import { failedJobs } from '$lib/server/queue';
import { acessoDoProfessor, resumoDoAcesso } from '$lib/server/billing/acesso';
import { textoDoEvento } from '$lib/billing/auditoria';
import type { AdminScope } from '$lib/server/auth/guard';

/**
 * O painel interno — a ÚNICA leitura entre professores do produto, além da
 * coordenação da escola (auth.md). Só existe com um `AdminScope`, que só
 * `requirePlatformAdmin` produz.
 *
 * **O que o admin vê: conta, cobrança, contagens e auditoria. Nunca dado de
 * aluno** — nem nome, nem resposta, nem conteúdo de atividade. Administrar
 * assinatura não precisa de nada disso, e o que não é lido não vaza
 * (auth.md "Dados do aluno e LGPD"). Os DTOs abaixo são explícitos por isso.
 */
// O escopo não é LIDO: ele existe para o TIPO — sem passar pelo guard não há
// `AdminScope`, e sem ele esta função não pode ser chamada.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function admin(_scope: AdminScope) {
	const agora = () => new Date();

	return {
		async visaoGeral() {
			const daqui3dias = new Date(Date.now() + 3 * 24 * 3600 * 1000);
			const [total, emTrial, trialsVencendo, porPlano, pedidos, falhados] = await Promise.all([
				prisma.teacher.count(),
				prisma.teacher.count({
					where: { subscriptionStatus: 'trialing', trialEndsAt: { gt: agora() } }
				}),
				prisma.teacher.findMany({
					where: { subscriptionStatus: 'trialing', trialEndsAt: { gt: agora(), lte: daqui3dias } },
					select: { id: true, name: true, email: true, trialEndsAt: true },
					orderBy: { trialEndsAt: 'asc' },
					take: 20
				}),
				prisma.teacher.groupBy({
					by: ['plan'],
					where: { subscriptionStatus: 'active', currentPeriodEnd: { gt: agora() } },
					_count: { _all: true }
				}),
				prisma.planRequest.count({ where: { status: 'pendente' } }),
				prisma.job.count({ where: { status: 'failed' } })
			]);
			return {
				total,
				emTrial,
				trialsVencendo,
				ativosPorPlano: porPlano.map((linha) => ({ plano: linha.plan, n: linha._count._all })),
				pedidosPendentes: pedidos,
				jobsFalhados: falhados
			};
		},

		professores(busca: string) {
			const termo = busca.trim();
			return prisma.teacher.findMany({
				where: termo
					? {
							OR: [
								{ name: { contains: termo, mode: 'insensitive' } },
								{ email: { contains: termo, mode: 'insensitive' } },
								{ id: termo }
							]
						}
					: undefined,
				orderBy: { createdAt: 'desc' },
				take: 50,
				select: {
					id: true,
					name: true,
					email: true,
					plan: true,
					subscriptionStatus: true,
					trialEndsAt: true,
					currentPeriodEnd: true,
					createdAt: true,
					_count: { select: { activities: true, contentUnits: true } }
				}
			});
		},

		async professor(id: string) {
			const linha = await prisma.teacher.findUnique({
				where: { id },
				select: {
					id: true,
					name: true,
					email: true,
					createdAt: true,
					plan: true,
					planCycle: true,
					subscriptionStatus: true,
					trialEndsAt: true,
					currentPeriodEnd: true,
					cancelAtPeriodEnd: true
				}
			});
			if (!linha) return null;
			const [estado, eventos, pedidos] = await Promise.all([
				acessoDoProfessor({ id }),
				prisma.auditEvent.findMany({
					where: { teacherId: id },
					orderBy: { createdAt: 'desc' },
					take: 40,
					select: { id: true, actor: true, type: true, data: true, createdAt: true }
				}),
				prisma.planRequest.findMany({
					where: { teacherId: id },
					orderBy: { createdAt: 'desc' },
					take: 10,
					select: { id: true, plano: true, ciclo: true, status: true, createdAt: true }
				})
			]);
			return {
				conta: linha,
				acesso: resumoDoAcesso(estado),
				historico: eventos.map((e) => ({
					id: e.id,
					texto: textoDoEvento(e.type, e.data),
					ator: e.actor,
					quando: e.createdAt
				})),
				pedidos
			};
		},

		pedidosPendentes() {
			return prisma.planRequest.findMany({
				where: { status: 'pendente' },
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					plano: true,
					ciclo: true,
					createdAt: true,
					teacher: { select: { id: true, name: true, email: true, plan: true } }
				}
			});
		},

		async cancelarPedido(pedidoId: string, adminId: string): Promise<boolean> {
			const { count } = await prisma.planRequest.updateMany({
				where: { id: pedidoId, status: 'pendente' },
				data: { status: 'cancelado', resolvedAt: new Date(), resolvedBy: adminId }
			});
			return count > 0;
		},

		escolas() {
			return prisma.school.findMany({
				orderBy: { createdAt: 'desc' },
				include: { _count: { select: { members: true } } }
			});
		},

		/** A escola com os membros (conta e exceções de limite) e os convites em aberto. */
		async escola(id: string) {
			const s = await prisma.school.findUnique({
				where: { id },
				include: {
					members: {
						orderBy: { createdAt: 'asc' },
						select: {
							id: true,
							role: true,
							createdAt: true,
							atividadesMax: true,
							materiaisMax: true,
							creditosMax: true,
							teacher: { select: { id: true, name: true, email: true } }
						}
					},
					invites: {
						where: { acceptedAt: null },
						orderBy: { createdAt: 'desc' },
						select: { id: true, email: true, role: true, expiresAt: true, sentAt: true }
					}
				}
			});
			return s;
		},

		/** Jobs que esgotaram as tentativas — o "aparece no painel" de server.md "Fila". */
		async jobsFalhados() {
			const jobs = await failedJobs(30);
			return jobs.map((job) => ({
				id: job.id,
				tipo: job.type,
				tentativas: job.attempts,
				erro: job.lastError,
				quando: job.updatedAt
			}));
		},

		/** Devolve um job falhado para a fila — o worker tenta de novo do zero. */
		async reenfileirarJob(jobId: string): Promise<boolean> {
			const { count } = await prisma.job.updateMany({
				where: { id: jobId, status: 'failed' },
				data: { status: 'pending', attempts: 0, runAfter: new Date(), lastError: null }
			});
			return count > 0;
		}
	};
}
