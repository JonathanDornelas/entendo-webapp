import type { PageServerLoad } from './$types';
import { requirePlatformAdmin } from '$lib/server/auth/guard';
import { admin } from '$lib/server/db/repos/admin';

export const load: PageServerLoad = async ({ locals }) => {
	const repo = admin(requirePlatformAdmin(locals));
	const [geral, falhados] = await Promise.all([repo.visaoGeral(), repo.jobsFalhados()]);
	return { geral, falhados };
};
