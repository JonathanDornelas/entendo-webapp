import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { acessoDoProfessor, resumoDoAcesso } from '$lib/server/billing/acesso';
import { contaProfessor } from '$lib/server/db/repos/teachers';
import { labelForTag } from '$lib/kernel/language/profiles';

/**
 * A etapa 1 sabe ANTES de o professor digitar se cabe uma atividade nova no
 * plano: descobrir isso só ao clicar em "Continuar", depois de escolher título,
 * idiomas e habilidades, é jogar o trabalho dele fora. Quem barra de verdade
 * continua sendo `criarAtividade`, dentro da trava de cota (adr-002-billing.md).
 */
export const load: PageServerLoad = async ({ locals }) => {
	const teacher = requireTeacher(locals);
	const [estado, perfil] = await Promise.all([
		acessoDoProfessor(teacher),
		contaProfessor(teacher).perfil()
	]);
	return {
		acesso: resumoDoAcesso(estado),
		// Os selects nascem no que o professor disse que ensina (Conta), não num
		// "Inglês (EUA)" fixo. Os rótulos são os de `languageLabels`, que a tela itera.
		padrao: {
			alvo: perfil.idiomas[0] ? labelForTag(perfil.idiomas[0]) : 'Inglês (EUA)',
			aluno: labelForTag(perfil.idiomaDosAlunos)
		}
	};
};
