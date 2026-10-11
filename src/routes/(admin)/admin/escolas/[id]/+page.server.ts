import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requirePlatformAdmin } from '$lib/server/auth/guard';
import { admin } from '$lib/server/db/repos/admin';

export const load: PageServerLoad = async ({ locals, params }) => {
	const escola = await admin(requirePlatformAdmin(locals)).escola(params.id);
	if (!escola) error(404, 'Escola não encontrada');
	return {
		escola: {
			id: escola.id,
			name: escola.name,
			status: escola.status as 'ativa' | 'suspensa' | 'encerrada',
			seats: escola.seats,
			atividadesPorProfessor: escola.atividadesPorProfessor,
			materiaisPorProfessor: escola.materiaisPorProfessor,
			creditosPorProfessor: escola.creditosPorProfessor,
			contractEndsAt: escola.contractEndsAt
		},
		membros: escola.members,
		convites: escola.invites
	};
};
