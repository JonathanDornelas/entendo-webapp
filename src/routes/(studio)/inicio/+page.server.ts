import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { painelDoInicio } from '$lib/server/inicio/painel';
import { isIaConfigurada } from '$lib/server/ia';

/**
 * O início do Studio — para onde o professor vai ao entrar (paginas.md
 * "Início"). Só lê: cada peça leva à tela da área, onde as ações moram. A
 * assinatura vem do layout (`data.acesso`), o mesmo estado do cartão da barra
 * lateral.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const teacher = requireTeacher(locals);
	return {
		primeiroNome: teacher.name.trim().split(/\s+/)[0] || teacher.name,
		painel: await painelDoInicio(teacher),
		// O "Criar com IA" do topo só aparece quando há provedor; o plano decide
		// pelo `acesso.pode.usarIa` do layout, a mesma decisão que barra o servidor.
		iaConfigurada: isIaConfigurada()
	};
};
