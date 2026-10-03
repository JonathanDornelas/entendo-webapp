import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { baseURL, trustedOrigins } from './base-url';
import { prisma } from '$lib/server/db/client';

/**
 * A conta do ALUNO. Segunda instância do Better Auth, com tabelas próprias e
 * base path próprio.
 *
 * **Por que não um campo `role` na conta do professor.** Professor tem
 * assinatura, atividades, turmas e alunos pendurados nele; misturar os dois na
 * mesma tabela faria toda query de professor precisar de um filtro a mais para
 * não devolver aluno — e o dia em que um esquecesse esse filtro seria um
 * incidente. Aqui as duas identidades não têm como se confundir: são cookies
 * diferentes, tabelas diferentes e guards diferentes. O hash de senha e a
 * sessão continuam sendo da biblioteca, nunca nossos (auth.md).
 *
 * **A conta é OPCIONAL e não destrava nada.** O produto continua sendo "abre o
 * link, digita o nome e responde" — a conta serve para o aluno guardar o
 * histórico dele e reencontrá-lo em outro aparelho. Nenhuma atividade exige
 * login, e nenhuma tela do aluno pede conta antes de deixar responder.
 *
 * **Dado coletado: nome, e-mail e senha. Nada além disso** (auth.md "Dados do
 * aluno e LGPD"). Boa parte do público é menor de idade, então qualquer campo
 * novo aqui é decisão do dono do repositório, não de quem estiver programando.
 */
export const authAluno = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	baseURL,
	trustedOrigins,
	basePath: '/api/auth-aluno',
	database: prismaAdapter(prisma, { provider: 'postgresql' }),
	// Cookie próprio: sem isto as duas instâncias brigariam pelo mesmo nome e
	// entrar como aluno derrubaria a sessão do professor no mesmo browser — que
	// é exatamente o caso do professor testando a própria atividade.
	advanced: { cookiePrefix: 'entendo-aluno' },
	user: {
		modelName: 'studentAccount',
		additionalFields: {
			/**
			 * O avatar, como dezoito números (`$lib/avatar/montar.ts`).
			 *
			 * **É campo novo na conta do aluno, e por isso passou pela decisão do
			 * dono do repositório** — a regra acima existe justamente para isto.
			 * O que o aprovou: não é dado COLETADO nem observado, é escolha de
			 * enfeite; não identifica ninguém (dezoito índices de peça de desenho,
			 * sem texto livre onde caiba um nome); e é opcional, então uma conta
			 * que nunca abre o editor continua sendo só nome, e-mail e senha.
			 */
			avatar: { type: 'string', required: false }
		}
	},
	session: { modelName: 'studentSession' },
	account: { modelName: 'studentCredential' },
	verification: { modelName: 'studentVerification' },
	emailAndPassword: {
		enabled: true,
		// Mesmo provedor indefinido do resto (CLAUDE.md "Pendências"): até
		// existir um, o link de redefinição só sai no console. Bloqueia produção.
		sendResetPassword: async ({ user, url }) => {
			console.log(`[auth-aluno] link de redefinição para ${user.email}: ${url}`);
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
