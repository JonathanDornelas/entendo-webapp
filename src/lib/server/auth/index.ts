import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { baseURL, trustedOrigins } from './base-url';
import { prisma } from '$lib/server/db/client';

// `user` é renomeado para `teacher` porque é o modelo de conta do produto — ver
// prisma/schema.prisma e .claude/rules/auth.md. Os campos extras são o estado de
// acesso do professor, atualizado pelo webhook do Stripe (.claude/rules/billing.md).
export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	baseURL,
	trustedOrigins,
	database: prismaAdapter(prisma, { provider: 'postgresql' }),
	user: {
		modelName: 'teacher',
		// Professor recém-cadastrado entra em `trialing` e já consegue criar e
		// publicar. É PROVISÓRIO: duração do trial e exigência de cartão são
		// pendências de produto (CLAUDE.md), e quem passa a escrever este
		// campo é o webhook do Stripe quando a cobrança existir. Sem isto,
		// ninguém publica nada, porque `can(teacher, 'publicar_atividade')`
		// exige assinatura (billing.md "Entitlements").
		additionalFields: {
			plan: { type: 'string', required: false },
			subscriptionStatus: { type: 'string', required: false, defaultValue: 'trialing' },
			currentPeriodEnd: { type: 'date', required: false },
			gracePeriodEnd: { type: 'date', required: false },
			stripeCustomerId: { type: 'string', required: false },
			// O avatar entra aqui para viajar na SESSÃO: o cabeçalho do Studio o
			// desenha em toda tela, e sem isto cada `load` precisaria de uma
			// consulta só para buscar dezoito números que a sessão já poderia
			// carregar. É a mesma razão de `plan` estar nesta lista.
			avatar: { type: 'string', required: false }
		}
	},
	emailAndPassword: {
		enabled: true,
		// Provedor de e-mail ainda indefinido — ver "Pendências" no CLAUDE.md. Até
		// existir um real, o link de redefinição só aparece no console do
		// servidor; suficiente para dev, mas isto BLOQUEIA produção.
		sendResetPassword: async ({ user, url }) => {
			console.log(`[auth] link de redefinição de senha para ${user.email}: ${url}`);
		}
	},
	// Precisa ser o último plugin da lista — ver docs do better-auth/svelte-kit.
	plugins: [sveltekitCookies(getRequestEvent)]
});
