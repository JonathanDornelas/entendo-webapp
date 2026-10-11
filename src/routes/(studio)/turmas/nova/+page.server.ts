import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { contaProfessor } from '$lib/server/db/repos/teachers';
import { labelForTag } from '$lib/kernel/language/profiles';

/**
 * O idioma da turma nasce marcado quando o professor ensina UM só (Conta): aí
 * a resposta é óbvia. Com dois ou mais, nenhum vem marcado — adivinhar entre
 * eles erraria metade das vezes, e corrigir uma escolha errada custa mais que
 * fazer uma.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const perfil = await contaProfessor(requireTeacher(locals)).perfil();
	return { idiomaPadrao: perfil.idiomas.length === 1 ? labelForTag(perfil.idiomas[0]) : '' };
};
