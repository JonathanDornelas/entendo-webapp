import type { PageServerLoad } from './$types';
import { requirePlatformAdmin } from '$lib/server/auth/guard';
import { admin } from '$lib/server/db/repos/admin';

export const load: PageServerLoad = async ({ locals }) => {
	return { pedidos: await admin(requirePlatformAdmin(locals)).pedidosPendentes() };
};
