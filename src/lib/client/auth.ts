import { createAuthClient } from 'better-auth/svelte';

// Cliente do Better Auth para o browser — chama direto os endpoints já
// montados em /api/auth/* por hooks.server.ts (svelteKitHandler). Nunca
// escreva sessão, hash de senha, reset ou verificação de e-mail à mão — ver
// .claude/rules/auth.md.
export const authClient = createAuthClient();
