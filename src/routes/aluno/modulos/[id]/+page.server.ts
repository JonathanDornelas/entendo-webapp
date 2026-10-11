import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { mapasDoAluno } from '$lib/server/db/repos/mapa-aluno';

/**
 * O mapa de um módulo, para o aluno com conta (docs/telas-modulos-aluno.md 2).
 *
 * Sem sessão o caminho é a tela de entrar, como no resto de `/aluno`. Módulo
 * que nenhuma turma desta conta tem responde 404 — sem dizer se ele existe
 * (auth.md: não distinguir "não existe" de "não é seu").
 */
export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.aluno) redirect(303, `/entrar?como=aluno&voltar=${encodeURIComponent(url.pathname)}`);
	const r = await mapasDoAluno({ id: locals.aluno.id }).um(params.id);
	if (!r) error(404, 'Módulo não encontrado');
	return {
		mapa: r.mapa,
		mundo: r.mundo,
		aluno: { nome: locals.aluno.name, avatar: locals.aluno.avatar ?? null }
	};
};
