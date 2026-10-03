import { createAuthClient } from 'better-auth/svelte';

/**
 * Cliente do Better Auth do ALUNO. Aponta para `/api/auth-aluno/*`, montado
 * por `hooks.server.ts` a partir da segunda instância — ver
 * `server/auth/aluno.ts`.
 *
 * É outro cliente e outro cookie de propósito: o do professor não serve aqui,
 * e entrar como aluno não pode derrubar (nem virar) a sessão do professor no
 * mesmo browser. Nunca escreva sessão, hash de senha ou reset à mão (auth.md).
 */
export const authAlunoClient = createAuthClient({ basePath: '/api/auth-aluno' });
