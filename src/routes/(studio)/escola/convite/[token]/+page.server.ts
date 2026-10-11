import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { prisma } from '$lib/server/db/client';

/**
 * O convite de escola, aberto pelo professor LOGADO — quem não está logado
 * passa pelo hook, entra (ou cria a conta) e volta para cá pelo `redirectTo`.
 *
 * A tela diz o que muda ANTES do aceite: o plano passa a ser o da escola, e a
 * coordenação passa a ver os NÚMEROS das turmas dele (docs/adr-005-escola.md).
 * Aceitar é dar a terceiros uma visão sobre o trabalho dele, então é escolha
 * explícita, num botão — nunca efeito de abrir o link.
 *
 * Leitura pelo token, sem escopo de professor: o token É a autorização para ver
 * este convite (como o `e/[token]` do aluno), e só sai daqui o nome da escola.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const teacher = requireTeacher(locals);
	const convite = await prisma.schoolInvite.findUnique({
		where: { token: params.token },
		select: {
			role: true,
			expiresAt: true,
			acceptedAt: true,
			email: true,
			school: { select: { id: true, name: true, status: true } }
		}
	});
	const filiacao = await prisma.schoolMembership.findUnique({
		where: { teacherId: teacher.id },
		select: { schoolId: true, school: { select: { name: true } } }
	});

	if (!convite)
		return {
			estado: 'invalido' as const,
			escola: null,
			role: null,
			emailDoConvite: null,
			outraEscola: null
		};

	const estado =
		filiacao?.schoolId === convite.school.id
			? ('ja-membro' as const)
			: convite.acceptedAt
				? ('usado' as const)
				: convite.expiresAt <= new Date()
					? ('expirado' as const)
					: convite.school.status !== 'ativa'
						? ('inativa' as const)
						: ('aberto' as const);

	return {
		estado,
		escola: convite.school.name,
		role: convite.role,
		// O e-mail do convite aparece só para o professor perceber se está na
		// conta errada — ele já tem o link, que foi para esse endereço.
		emailDoConvite: convite.email,
		outraEscola: filiacao && filiacao.schoolId !== convite.school.id ? filiacao.school.name : null
	};
};
