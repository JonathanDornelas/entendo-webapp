import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requirePlatformAdmin } from '$lib/server/auth/guard';
import { admin } from '$lib/server/db/repos/admin';

export const load: PageServerLoad = async ({ locals, params }) => {
	const detalhe = await admin(requirePlatformAdmin(locals)).professor(params.id);
	if (!detalhe) error(404, 'Professor não encontrado');
	return detalhe;
};
