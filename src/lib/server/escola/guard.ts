import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireTeacher } from '$lib/server/auth/guard';

declare const marcaCoordenacao: unique symbol;
/**
 * O escopo da COORDENAÇÃO de uma escola. Só `requireCoordenacao` produz um, e
 * o repositório que lê números ENTRE professores da escola (`repos/escola.ts`)
 * só aceita este tipo.
 */
export type CoordenacaoScope = {
	readonly teacherId: string;
	readonly schoolId: string;
	readonly [marcaCoordenacao]: true;
};

/**
 * A guarda da área da coordenação. Responde **404**: a área não existe para
 * quem não coordena, e um 403 confirmaria que ela está ali. Toda remote function
 * de `(studio)/escola` começa por aqui — remote function não passa pelo hook.
 *
 * Escola suspensa ou encerrada fecha a área também: a coordenação existe por
 * causa do contrato.
 */
export async function requireCoordenacao(locals: App.Locals): Promise<CoordenacaoScope> {
	const teacher = requireTeacher(locals);
	const membro = await prisma.schoolMembership.findUnique({
		where: { teacherId: teacher.id },
		select: { role: true, schoolId: true, school: { select: { status: true } } }
	});
	if (!membro || membro.role !== 'coordenacao' || membro.school.status !== 'ativa') {
		error(404, 'Not found');
	}
	return { teacherId: teacher.id, schoolId: membro.schoolId } as CoordenacaoScope;
}

/** Só para a TELA decidir se mostra a entrada "Escola" — a barreira é `requireCoordenacao`. */
export async function ehCoordenacao(teacherId: string): Promise<boolean> {
	const membro = await prisma.schoolMembership.findUnique({
		where: { teacherId },
		select: { role: true, school: { select: { status: true } } }
	});
	return membro?.role === 'coordenacao' && membro.school.status === 'ativa';
}
