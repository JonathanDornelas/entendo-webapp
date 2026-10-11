import type { PageServerLoad } from './$types';
import { requireCoordenacao } from '$lib/server/escola/guard';
import { escola } from '$lib/server/db/repos/escola';

/**
 * A área da coordenação. `requireCoordenacao` responde 404 para quem não
 * coordena — layout não é barreira (auth.md), então a guarda é aqui e em cada
 * remote function. Só números: nenhum nome de aluno, nenhuma resposta.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const repo = escola(await requireCoordenacao(locals));
	const [resumo, professores, turmas, convites] = await Promise.all([
		repo.resumo(),
		repo.professores(),
		repo.turmas(),
		repo.convitesPendentes()
	]);
	return { resumo, professores, turmas, convites, euId: locals.user?.id ?? null };
};
