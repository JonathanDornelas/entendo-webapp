import { dev } from '$app/environment';
import { enqueueRedefinirSenha } from '$lib/server/queue';

/**
 * Quanto vale o link de redefinir senha, em segundos — o MESMO número nas duas
 * instâncias de Better Auth (`resetPasswordTokenExpiresIn`), no e-mail ("vale
 * por 1 hora") e no job, que não manda link vencido.
 */
export const VALIDADE_DO_LINK_S = 60 * 60;

/**
 * O `sendResetPassword` das duas contas, professor e aluno: o link vai por
 * e-mail, pela fila (server.md "E-mail"). Quem chama é o Better Auth, e só para
 * e-mail que EXISTE — a tela responde igual nos dois casos, então nada aqui
 * pode virar erro visível.
 *
 * Em desenvolvimento o link também sai no console do servidor: sem worker
 * rodando, é o único jeito de testar o fluxo. Em produção, nunca — um link de
 * redefinição no log é uma senha no log.
 */
export async function pedirRedefinicaoDeSenha(
	conta: 'professor' | 'aluno',
	user: { email: string; name: string },
	url: string
): Promise<void> {
	if (dev) console.info(`[auth-${conta}] link de redefinição para ${user.email}: ${url}`);
	await enqueueRedefinirSenha({
		to: user.email,
		nome: user.name,
		link: url,
		conta,
		expiraEm: new Date(Date.now() + VALIDADE_DO_LINK_S * 1000).toISOString()
	});
}
