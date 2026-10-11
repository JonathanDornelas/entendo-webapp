/**
 * Um caminho de volta vindo da QUERY (`?redirectTo=`, `?voltar=`) só é aceito
 * se for interno: começa com UM "/" — nunca "//host", que o browser lê como
 * outro site. Sem isso, qualquer um forjaria um link de "entrar" que, depois do
 * login, mandasse a pessoa para fora daqui (redirect aberto).
 *
 * Era a mesma função escrita em `entrar` e em `cadastro`; agora é esta.
 */
export function caminhoInterno(valor: string | null | undefined): string | null {
	return valor && /^\/(?!\/)/.test(valor) ? valor : null;
}
