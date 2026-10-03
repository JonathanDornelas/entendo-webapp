import { prisma } from '$lib/server/db/client';
import type { ContentUnitKind } from '$lib/kernel/content/types';
import { parseContentUnit } from '$lib/kernel/content/parse';
import type { StoredContentUnit } from '$lib/kernel/generators';
import type { Prisma } from '../../../../../generated/prisma/client.ts';

/** Só o id importa para escopar — ver a nota em `activities.ts`. */
type TeacherScope = { id: string };

/**
 * O material mais em QUANTAS atividades ele está. É o que sustenta a etiqueta
 * "biblioteca": material em mais de uma atividade não nasceu ali, foi reusado.
 * Estende `StoredContentUnit` (o que os geradores consomem) em vez de
 * substituí-lo — o kernel não precisa saber de uso.
 */
export type UsedContentUnit = StoredContentUnit & { usedIn: number };

/**
 * Biblioteca de materiais do professor — escopada por `teacherId`, como todo
 * repositório (auth.md "Isolamento entre professores"). O material adicionado
 * dentro de uma atividade também entra aqui e pode ser reusado em outra.
 */
export function materiais(teacher: TeacherScope) {
	return {
		list(): Promise<UsedContentUnit[]> {
			return prisma.contentUnit
				.findMany({
					where: { teacherId: teacher.id },
					orderBy: { createdAt: 'desc' },
					include: { _count: { select: { activities: true } } }
				})
				.then((rows) =>
					rows.map((row) => ({
						id: row.id,
						kind: row.kind as ContentUnitKind,
						data: row.data,
						usedIn: row._count.activities
					}))
				);
		},

		byIds(ids: string[]): Promise<StoredContentUnit[]> {
			return prisma.contentUnit
				.findMany({
					where: { id: { in: ids }, teacherId: teacher.id },
					orderBy: { createdAt: 'asc' }
				})
				.then((rows) =>
					rows.map((row) => ({ id: row.id, kind: row.kind as ContentUnitKind, data: row.data }))
				);
		},

		/**
		 * O material DESTA atividade — não a biblioteca inteira. Sem o vínculo,
		 * a etapa 2 mostrava tudo que o professor já tinha cadastrado e a
		 * geração usava material de outra atividade.
		 */
		byActivity(activityId: string): Promise<UsedContentUnit[]> {
			return prisma.contentUnit
				.findMany({
					where: { teacherId: teacher.id, activities: { some: { id: activityId } } },
					orderBy: { createdAt: 'asc' },
					include: { _count: { select: { activities: true } } }
				})
				.then((rows) =>
					rows.map((row) => ({
						id: row.id,
						kind: row.kind as ContentUnitKind,
						data: row.data,
						// Em mais de uma atividade = veio da biblioteca (ou foi para
						// ela). É o que a etiqueta "biblioteca" mostra.
						usedIn: row._count.activities
					}))
				);
		},

		/**
		 * Um material IGUAL a este que o professor já tenha — mesma forma, mesmo
		 * conteúdo. Cadastrar a mesma frase de novo criava uma segunda linha na
		 * biblioteca, e o professor passava a ver duplicatas que ele não fez.
		 *
		 * A comparação é a igualdade de `jsonb` do Postgres, que ignora a ordem
		 * das chaves — comparar o texto do JSON daria falso negativo por causa
		 * disso. O `kind` entra no filtro porque a MESMA forma de dado em tipos
		 * diferentes é conteúdo diferente.
		 */
		async findEquivalent(kind: ContentUnitKind, data: unknown): Promise<string | null> {
			const parsed = parseContentUnit(kind, data);
			const existente = await prisma.contentUnit.findFirst({
				where: {
					teacherId: teacher.id,
					kind,
					data: { equals: parsed as Prisma.InputJsonValue }
				},
				select: { id: true },
				orderBy: { createdAt: 'asc' }
			});
			return existente?.id ?? null;
		},

		/**
		 * Cria já ligando à atividade; o material continua na biblioteca.
		 *
		 * Se o professor JÁ TEM um material idêntico, reaproveita aquele em vez
		 * de criar outro: a biblioteca é dele, e duas linhas com a mesma frase
		 * são duas coisas para ele manter em dia sem ganhar nada. `reused` diz
		 * qual dos dois aconteceu — é o que a tela mostra como "biblioteca".
		 */
		async createForActivity(
			activityId: string,
			kind: ContentUnitKind,
			data: unknown
		): Promise<{ id: string; reused: boolean }> {
			const equivalente = await this.findEquivalent(kind, data);
			if (equivalente) {
				// Já ligado a esta atividade? `connect` é idempotente no N:N, então
				// não há caso a tratar aqui.
				await prisma.contentUnit.update({
					where: { id: equivalente },
					data: { activities: { connect: { id: activityId } } }
				});
				return { id: equivalente, reused: true };
			}

			const parsed = parseContentUnit(kind, data);
			const criado = await prisma.contentUnit.create({
				data: {
					kind,
					data: parsed as Prisma.InputJsonValue,
					teacherId: teacher.id,
					activities: { connect: { id: activityId } }
				}
			});
			return { id: criado.id, reused: false };
		},

		/**
		 * Edição de um material já cadastrado. Revalida com o schema do kernel —
		 * o `kind` não muda: trocar o tipo de um material que já gerou itens
		 * deixaria `Item.sourceContentId` apontando para outra forma de dado.
		 */
		async update(id: string, kind: ContentUnitKind, data: unknown): Promise<boolean> {
			const parsed = parseContentUnit(kind, data);
			const { count } = await prisma.contentUnit.updateMany({
				where: { id, teacherId: teacher.id, kind },
				data: { data: parsed as Prisma.InputJsonValue }
			});
			return count > 0;
		},

		/** Traz para a atividade um material que já está na biblioteca. */
		async link(activityId: string, contentId: string): Promise<boolean> {
			const existe = await prisma.contentUnit.findFirst({
				where: { id: contentId, teacherId: teacher.id },
				select: { id: true }
			});
			if (!existe) return false;
			await prisma.contentUnit.update({
				where: { id: contentId },
				data: { activities: { connect: { id: activityId } } }
			});
			return true;
		},

		/** Tira o material da atividade — continua na biblioteca do professor. */
		async unlink(activityId: string, contentId: string): Promise<boolean> {
			const { count } = await prisma.contentUnit.updateMany({
				where: { id: contentId, teacherId: teacher.id },
				data: {}
			});
			if (count === 0) return false;
			await prisma.contentUnit.update({
				where: { id: contentId },
				data: { activities: { disconnect: { id: activityId } } }
			});
			return true;
		},

		/**
		 * Valida com o schema do kernel antes de gravar — nunca JSON solto.
		 * `async` de propósito: material fora do schema vira rejeição, não uma
		 * exceção síncrona no meio de quem chamou.
		 */
		async create(kind: ContentUnitKind, data: unknown) {
			const parsed = parseContentUnit(kind, data);
			return prisma.contentUnit.create({
				data: { kind, data: parsed as Prisma.InputJsonValue, teacherId: teacher.id }
			});
		},

		async createMany(kind: ContentUnitKind, entries: unknown[]) {
			const rows = entries.map((data) => ({
				kind,
				data: parseContentUnit(kind, data) as Prisma.InputJsonValue,
				teacherId: teacher.id
			}));
			return prisma.contentUnit.createMany({ data: rows });
		},

		/**
		 * Apaga o material. **E só isso.**
		 *
		 * O que está no ar continua intacto, e agora sem depender de nenhuma
		 * ressalva: material é FACILITADOR de montagem, e o áudio é identificado
		 * pelo conteúdo, escopado por professor (db.md "MediaAsset"). Não há
		 * ligação a desfazer nem limpeza a fazer aqui.
		 *
		 * Já houve `onDelete: Cascade` de `ContentUnit` para `MediaAsset`, e ele
		 * derrubava o link de uma atividade publicada para sempre: o áudio sumia,
		 * a entrada tentava repor, e o worker estourava em foreign key até o job ir
		 * para `failed`. Áudio vencido é varrido por `enfileirarAudioFaltante`.
		 */
		async remove(id: string): Promise<boolean> {
			const { count } = await prisma.contentUnit.deleteMany({
				where: { id, teacherId: teacher.id }
			});
			return count > 0;
		}
	};
}
