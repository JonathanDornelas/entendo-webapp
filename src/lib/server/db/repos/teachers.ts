import { prisma } from '$lib/server/db/client';

/**
 * A conta do PROFESSOR — o que ele muda sobre si mesmo.
 *
 * Existe para nenhuma remote function tocar `prisma.teacher` direto (regra
 * inviolável nº 4). O escopo aqui é sempre a própria conta: o id vem da sessão,
 * e nenhuma função deste arquivo aceita um id que não seja o dela — não há
 * "professor dono de professor".
 *
 * As outras leituras do professor não passam por aqui porque não precisam: os
 * campos de exibição (nome, plano, estado da cobrança) já viajam na sessão do
 * Better Auth.
 */
export function contaProfessor(teacher: { id: string }) {
	return {
		/** Grava o avatar. Dezoito números já normalizados — ver `avatar/schema.ts`. */
		async gravarAvatar(avatar: string): Promise<void> {
			await prisma.teacher.update({ where: { id: teacher.id }, data: { avatar } });
		}
	};
}
