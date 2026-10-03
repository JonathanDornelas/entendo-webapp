import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * A entrada do aluno virou o modo "Aluno" da tela única de entrar (`/entrar`,
 * com o seletor professor/aluno). A rota fica só para não quebrar link antigo
 * — e-mail, favorito, o que já estiver por aí — e repassa o `voltar`.
 */
export const load: PageServerLoad = ({ url }) => {
	const query = new URLSearchParams({ como: 'aluno' });
	const voltar = url.searchParams.get('voltar');
	if (voltar) query.set('voltar', voltar);
	redirect(307, `/entrar?${query}`);
};
