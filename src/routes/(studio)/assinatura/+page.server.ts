import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * A assinatura virou uma ABA da conta (`conta?aba=assinatura`). A rota fica
 * porque a barra lateral, o cartão de trial e qualquer link antigo apontam
 * para cá — e um 404 numa tela de cobrança é o pior lugar para ele aparecer.
 */
export const load: PageServerLoad = () => {
	redirect(307, '/conta?aba=assinatura');
};
