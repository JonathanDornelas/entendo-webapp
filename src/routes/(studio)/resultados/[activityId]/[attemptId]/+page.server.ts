import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { tentativaDoProfessor } from '$lib/server/resultados/leitura';

/**
 * Uma tentativa, resposta por resposta — e é AQUI que o professor comenta e
 * corrige. A fila de correção à parte deixou de existir: ela obrigava a
 * decidir sem ver o resto da tentativa, e as respostas que não eram por
 * rubrica não tinham onde receber um comentário (paginas.md "Resultados").
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const teacher = requireTeacher(locals);
	const tentativa = await tentativaDoProfessor(teacher.id, params.attemptId);
	// Não distinga "não existe" de "não é sua" — isso vaza a existência do
	// recurso (auth.md).
	if (!tentativa) error(404, 'Tentativa não encontrada');

	return tentativa;
};
