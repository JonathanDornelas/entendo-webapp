import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { previaDoMapa } from '$lib/server/db/repos/mapa-aluno';

/**
 * "Ver como o aluno vê" (docs/telas-modulos-professor.md 2.6): o mapa das fases
 * com a programação de UMA turma — o que já está liberado e o que abre em cada
 * data. **Sem progresso de aluno nenhum**: a prévia não lê tentativa.
 *
 * A turma vem de `?turma=<alocação>`, e `previaDoMapa` confere que ela é de um
 * módulo deste professor; a de outro responde 404.
 */
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const teacher = requireTeacher(locals);
	const mapa = await previaDoMapa(teacher.id, url.searchParams.get('turma') ?? '');
	if (!mapa || mapa.id !== params.id) error(404, 'Módulo não encontrado');
	return { mapa };
};
