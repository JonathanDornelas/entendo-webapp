import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/**
 * A `baseURL` que as duas instâncias do Better Auth recebem — e por que ela é
 * `undefined` em desenvolvimento.
 *
 * `svelteKitHandler` decide se a requisição é dele comparando a ORIGEM dela
 * com a de `baseURL` (`isAuthPath`, em better-auth/integrations/svelte-kit).
 * Se não bate, ele devolve o request para o SvelteKit — que não tem rota
 * `/api/auth/*` nenhuma e responde **404**.
 *
 * Em dev a porta é a que o Vite conseguir: com a 5173 ocupada ele sobe na
 * 5174, a origem deixa de bater com o `BETTER_AUTH_URL` do `.env` e TODO o
 * login para de funcionar com um 404 que não explica nada. Sem `baseURL`, a
 * biblioteca usa a origem do próprio request e acerta sempre.
 *
 * Em produção ela continua vindo do ambiente: ali o endereço é fixo, é o que
 * entra nos links de e-mail (redefinição de senha) e não pode sair de um
 * `Host` que o cliente controla.
 */
export const baseURL = dev ? undefined : env.BETTER_AUTH_URL;

/**
 * As origens que podem enviar formulário de auth — a proteção de CSRF da
 * biblioteca. Por padrão ela é só a `baseURL`, e é isso que tem que valer em
 * produção: origem fixa, conhecida, e nada que o cliente controle.
 *
 * Em desenvolvimento a origem é `localhost` na porta que o Vite conseguir, e
 * fixá-la trocava o 404 do `isAuthPath` por um **403** — o browser manda
 * `Origin: http://localhost:5174` e a biblioteca recusa. (Por isso o `curl`
 * passava e a tela não: `curl` não manda `Origin`.)
 *
 * O `request` é OPCIONAL na assinatura da biblioteca
 * (`(request?: Request) => …`). Declará-lo obrigatório aqui não dá erro nesta
 * linha: faz o objeto de opções inteiro perder a tipagem contextual, e o
 * sintoma aparece longe daqui — os campos extras do professor (`plan`,
 * `subscriptionStatus`) somem de `$Infer.Session`.
 */
export function trustedOrigins(request?: Request): string[] {
	// Produção: a origem configurada e mais nenhuma — o mesmo que a biblioteca
	// faria sozinha, escrito à mão porque aqui a função é uma só.
	if (!dev) return env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : [];

	const origem = request?.headers.get('origin');
	return origem ? [origem] : [];
}
