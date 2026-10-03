// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { auth } from '$lib/server/auth';
import type { authAluno } from '$lib/server/auth/aluno';

type AuthSession = typeof auth.$Infer.Session;
type SessaoAluno = typeof authAluno.$Infer.Session;

declare global {
	namespace App {
		// `ref`: id curto de suporte mostrado no +error.svelte genérico, para o
		// professor citar ao reportar um bug. `reason`: motivo específico de link
		// indisponível no Player — ver a/[slug]/+error.svelte e paginas.md "Player".
		interface Error {
			message: string;
			ref?: string;
			reason?: 'notFound' | 'unpublished' | 'audioPending' | 'attemptLost';
		}
		interface Locals {
			user: AuthSession['user'] | null;
			session: AuthSession['session'] | null;
			// A conta do ALUNO é outra identidade, com cookie e tabela próprios.
			// Nunca preencha `user` a partir dela: professor e aluno não se
			// convertem um no outro (auth.md).
			aluno: SessaoAluno['user'] | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
