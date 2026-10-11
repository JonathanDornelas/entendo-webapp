import { prisma } from '$lib/server/db/client';

type TeacherScope = { id: string };

/**
 * O que o professor vê da PRÓPRIA cobrança: o pedido de plano pendente e o
 * histórico (`AuditEvent`). Escopado pelo id da sessão, como `contaProfessor` —
 * nenhuma função aceita outro id (regra inviolável nº 4).
 *
 * Escrever na cobrança NÃO passa por aqui: o único escritor é
 * `$lib/server/billing/assinaturas.ts`.
 */
export function minhaAssinatura(teacher: TeacherScope) {
	return {
		pedidoPendente() {
			return prisma.planRequest.findFirst({
				where: { teacherId: teacher.id, status: 'pendente' },
				orderBy: { createdAt: 'desc' },
				select: { id: true, plano: true, ciclo: true, createdAt: true }
			});
		},

		/** Cancela o PRÓPRIO pedido pendente. Devolve se havia um. */
		async cancelarPedido(): Promise<boolean> {
			const { count } = await prisma.planRequest.updateMany({
				where: { teacherId: teacher.id, status: 'pendente' },
				data: { status: 'cancelado', resolvedAt: new Date() }
			});
			return count > 0;
		},

		historico(limite = 12) {
			return prisma.auditEvent.findMany({
				where: { teacherId: teacher.id },
				orderBy: { createdAt: 'desc' },
				take: limite,
				select: { id: true, type: true, data: true, createdAt: true }
			});
		}
	};
}
