import type { LayoutServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { prisma } from '$lib/server/db/client';

// Só carrega dado de exibição — a barreira de verdade já rodou em
// hooks.server.ts antes deste load existir (auth.md: layout nunca é guarda).
// `requireTeacher` aqui não protege nada sozinho; só formata o DTO — nunca
// devolva a entidade do Teacher inteira para o browser (auth.md "Serialização").
export const load: LayoutServerLoad = async ({ locals }) => {
	const teacher = requireTeacher(locals);
	const initials = teacher.name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');

	// `trialing` é o estado de quem acabou de se cadastrar — dizer "Sem
	// assinatura" para ele é errado, ele TEM acesso (billing.md "Trial
	// provisório").
	const emTrial = teacher.subscriptionStatus === 'trialing';
	const planLabel =
		teacher.subscriptionStatus === 'active'
			? (teacher.plan ?? 'Assinatura ativa')
			: emTrial
				? 'Período de teste'
				: teacher.subscriptionStatus === 'past_due'
					? 'Pagamento atrasado'
					: 'Sem assinatura';

	// Badge de "Resultados": respostas de escrita esperando o retorno do
	// professor. O critério é `reviewedAt` nulo, não `score: 0` — zero numa
	// resposta de rubrica é "ainda não corrigida", e pelo critério antigo a
	// resposta continuava contando depois de o professor ter dado nota zero a
	// ela. Escopado pelo professor dono da publicação.
	const aCorrigir = await prisma.attemptItem.count({
		where: {
			reviewedAt: null,
			item: {
				grading: { path: ['mode'], equals: 'rubric' },
				activityVersion: { activity: { teacherId: teacher.id } }
			}
		}
	});

	return {
		teacher: {
			initials: initials || '?',
			name: teacher.name,
			email: teacher.email,
			plan: planLabel,
			// Duração do trial ainda não definida (CLAUDE.md "Pendências"), então
			// o card mostra o estado sem contagem de dias.
			emTrial
		},
		aCorrigir
	};
};
