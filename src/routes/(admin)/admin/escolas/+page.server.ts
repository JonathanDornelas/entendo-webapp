import type { PageServerLoad } from './$types';
import { requirePlatformAdmin } from '$lib/server/auth/guard';
import { admin } from '$lib/server/db/repos/admin';

export const load: PageServerLoad = async ({ locals }) => {
	const escolas = await admin(requirePlatformAdmin(locals)).escolas();
	return {
		escolas: escolas.map((s) => ({
			id: s.id,
			name: s.name,
			status: s.status,
			seats: s.seats,
			membros: s._count.members,
			contractEndsAt: s.contractEndsAt
		}))
	};
};
