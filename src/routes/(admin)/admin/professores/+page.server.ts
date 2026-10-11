import type { PageServerLoad } from './$types';
import { requirePlatformAdmin } from '$lib/server/auth/guard';
import { admin } from '$lib/server/db/repos/admin';
import { situacaoDaCobranca } from '$lib/server/billing/entitlements';
import { NOME_DO_PLANO, ehPlanoPago } from '$lib/billing/catalogo';

export const load: PageServerLoad = async ({ locals, url }) => {
	const repo = admin(requirePlatformAdmin(locals));
	const busca = url.searchParams.get('q') ?? '';
	const agora = new Date();
	const linhas = await repo.professores(busca);
	return {
		busca,
		professores: linhas.map((p) => ({
			id: p.id,
			name: p.name,
			email: p.email,
			plano: ehPlanoPago(p.plan) ? NOME_DO_PLANO[p.plan] : null,
			situacao: situacaoDaCobranca(p, agora),
			atividades: p._count.activities,
			materiais: p._count.contentUnits,
			desde: p.createdAt
		}))
	};
};
