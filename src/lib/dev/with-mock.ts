/**
 * Nem toda rota tem `+page.server.ts` ainda (paginas.md "O que falta"). Sem
 * loader próprio, o `data` que a página recebe é só o que os LAYOUTS
 * ancestrais carregam — no Studio isso já inclui `{ teacher }` de
 * `(studio)/+layout.server.ts`, então `data` não é mais `{}`, mas também não
 * tem os campos que a página em si espera.
 *
 * Por isso o critério não é "data tem alguma chave" (isso quebrou assim que o
 * primeiro layout ganhou loader de verdade) — é "data tem TODAS as chaves que
 * o mock declara". Só aí dá pra confiar que existe um loader real da própria
 * página, não só um layout ancestral vazando dado que não é dele.
 */
export function withMock<T extends object>(data: Partial<T> | undefined, mock: T): T {
	if (!data) return mock;
	const hasEveryKey = Object.keys(mock).every((key) => key in data);
	return hasEveryKey ? (data as T) : mock;
}
