import { prisma, type Db } from '$lib/server/db/client';
import type { MotivoDoBloqueio } from '$lib/billing/motivos';
import { acessoDoProfessor } from './acesso';
import { cabe, motivoDoBloqueio, type EstadoDeAcesso, type Recurso } from './entitlements';

type TeacherScope = { id: string };

/**
 * A escrita com COTA de estoque (docs/adr-002-billing.md): contar o que existe
 * e criar o novo precisam ser atômicos, senão duas criações simultâneas veem a
 * mesma vaga livre e as duas passam.
 *
 * A trava é `SELECT ... FOR NO KEY UPDATE` na linha do professor, dentro da
 * transação. `NO KEY` e não `FOR UPDATE` de propósito: ele serializa quem
 * disputa a cota, mas não conflita com o `FOR KEY SHARE` que o Postgres pega ao
 * inserir uma linha que referencia o professor — então criar sessão, gravar
 * áudio ou responder continuam livres enquanto a cota está travada.
 *
 * Regras de quem escreve `fn`:
 * - **Toda escrita usa o `tx` recebido** (os repositórios aceitam `db`). Com o
 *   `prisma` global a escrita iria por outra conexão: fora da trava, e travada
 *   atrás dela até o timeout.
 * - **Nada de chamada de rede aqui dentro** (IA, e-mail, storage) — a trava
 *   duraria o tempo da rede.
 */
export async function comCota<T>(
	teacher: TeacherScope,
	recurso: Recurso,
	pedidos: number,
	fn: (tx: Db, cabem: number, estado: EstadoDeAcesso) => Promise<T>
): Promise<T> {
	return prisma.$transaction(
		async (tx) => {
			await travarProfessor(tx, teacher.id);
			const estado = await acessoDoProfessor(teacher, tx);
			return fn(tx, cabe(estado, recurso, pedidos), estado);
		},
		// Lote de materiais confere equivalência linha a linha dentro da trava.
		{ timeout: 15_000, maxWait: 5_000 }
	);
}

/** Trava a linha do professor até o fim da transação. Ver `comCota`. */
export async function travarProfessor(tx: Db, teacherId: string): Promise<void> {
	await tx.$executeRaw`SELECT 1 FROM "Teacher" WHERE id = ${teacherId} FOR NO KEY UPDATE`;
}

/** O motivo do bloqueio de CRIAR um recurso — o que a tela usa para mandar a `/planos?motivo=`. */
export function motivoDeCriar(estado: EstadoDeAcesso, recurso: Recurso): MotivoDoBloqueio {
	return (
		motivoDoBloqueio(estado, recurso === 'atividades' ? 'criar_atividade' : 'criar_material') ??
		(recurso === 'atividades' ? 'criar' : 'materiais')
	);
}
