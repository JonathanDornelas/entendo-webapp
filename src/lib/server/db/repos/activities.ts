import { prisma } from '$lib/server/db/client';
import type { Item } from '$lib/kernel/item';
import type { Prisma } from '../../../../../generated/prisma/client.ts';

/**
 * O repositório só precisa do id para escopar — pedir a linha inteira do
 * Prisma acopla ele à forma exata da sessão do Better Auth, que traz os
 * mesmos campos com opcionalidade diferente.
 */
type TeacherScope = { id: string };

/**
 * Padrão de repositório escopado por professor — ver .claude/rules/auth.md
 * "Isolamento entre professores" e .claude/rules/db.md "Repositórios". Nunca
 * use `prisma.activity` cru numa remote function; use isto.
 *
 * `byId` devolve `null` tanto quando o registro não existe quanto quando
 * pertence a outro professor — não distinga os dois casos, isso vaza a
 * existência do recurso.
 *
 * **Rascunho é uma `ActivityVersion` sem `Publication`.** Publicar não cria
 * versão nova: ele PUBLICA o rascunho, e a partir daí aquela versão está
 * congelada (regra inviolável nº 7). A próxima edição abre a versão seguinte.
 */
export function atividades(teacher: TeacherScope) {
	return {
		byId(id: string) {
			return prisma.activity.findFirst({ where: { id, teacherId: teacher.id } });
		},

		list() {
			return prisma.activity.findMany({
				where: { teacherId: teacher.id },
				orderBy: { createdAt: 'desc' },
				include: {
					versions: {
						orderBy: { versionNumber: 'desc' },
						include: {
							items: { select: { prompt: true, interaction: true } },
							publications: {
								select: { id: true, slug: true, _count: { select: { attempts: true } } }
							}
						}
					}
				}
			});
		},

		/**
		 * `plano` é o que a etapa 1 passou a perguntar: quantas questões gerar e
		 * quais habilidades a atividade treina. Fica na atividade, não na versão,
		 * porque é preferência do professor — regerar os itens tem que respeitar
		 * a mesma escolha sem ele repetir nada.
		 */
		create(
			title: string,
			sourceLang: string,
			targetLang: string,
			plano: { itemTarget: number; skills: string[] }
		) {
			return prisma.activity.create({
				data: {
					title,
					sourceLang,
					targetLang,
					teacherId: teacher.id,
					itemTarget: plano.itemTarget,
					skills: plano.skills
				}
			});
		},

		/** A versão em edição: a de maior número que ainda não foi publicada. */
		async draft(activityId: string) {
			const activity = await prisma.activity.findFirst({
				where: { id: activityId, teacherId: teacher.id }
			});
			if (!activity) return null;

			return prisma.activityVersion.findFirst({
				where: { activityId, publications: { none: {} } },
				orderBy: { versionNumber: 'desc' },
				include: { items: { orderBy: { order: 'asc' } } }
			});
		},

		/** A última versão publicada, se existir. */
		async published(activityId: string) {
			const activity = await prisma.activity.findFirst({
				where: { id: activityId, teacherId: teacher.id }
			});
			if (!activity) return null;

			return prisma.activityVersion.findFirst({
				where: { activityId, publications: { some: {} } },
				orderBy: { versionNumber: 'desc' },
				include: { items: { orderBy: { order: 'asc' } }, publications: true }
			});
		},

		/**
		 * A cópia editável de uma atividade que já está no ar.
		 *
		 * Publicar congela a versão (regra nº 7) e o rascunho deixa de existir,
		 * então "Editar atividade" caía numa tela de revisão VAZIA — a atividade
		 * do professor sumia da frente dele e o único caminho era gerar tudo de
		 * novo. Aqui a versão publicada é clonada item a item num rascunho novo:
		 * ela continua intacta para quem está respondendo, e o professor volta a
		 * mexer no que já tinha.
		 *
		 * Idempotente por definição: se já existe rascunho, devolve aquele. É o
		 * que permite chamar isto de um loader sem duplicar nada a cada visita.
		 */
		async draftFromPublished(activityId: string) {
			const existente = await this.draft(activityId);
			if (existente) return existente;

			const publicada = await this.published(activityId);
			if (!publicada) return null;

			return prisma.$transaction(async (tx) => {
				const last = await tx.activityVersion.findFirst({
					where: { activityId },
					orderBy: { versionNumber: 'desc' }
				});
				const criada = await tx.activityVersion.create({
					data: { activityId, versionNumber: (last?.versionNumber ?? 0) + 1 }
				});

				await tx.item.createMany({
					data: publicada.items.map((item, index) => ({
						sourceContentId: item.sourceContentId,
						generatedBy: item.generatedBy,
						order: index,
						prompt: item.prompt as Prisma.InputJsonValue,
						interaction: item.interaction as Prisma.InputJsonValue,
						grading: item.grading as Prisma.InputJsonValue,
						locale: item.locale as Prisma.InputJsonValue,
						activityVersionId: criada.id
					}))
				});

				return tx.activityVersion.findUniqueOrThrow({
					where: { id: criada.id },
					include: { items: { orderBy: { order: 'asc' } } }
				});
			});
		},

		/**
		 * Troca o conteúdo do RASCUNHO pelos itens recém-gerados. Nunca toca
		 * numa versão publicada: se a última versão já tem `Publication`, abre
		 * a próxima em vez de editar aquela.
		 */
		async replaceDraftItems(activityId: string, items: Item[]) {
			const activity = await prisma.activity.findFirst({
				where: { id: activityId, teacherId: teacher.id }
			});
			if (!activity) return null;

			return prisma.$transaction(async (tx) => {
				const draft = await tx.activityVersion.findFirst({
					where: { activityId, publications: { none: {} } },
					orderBy: { versionNumber: 'desc' }
				});

				let versionId: string;
				if (draft) {
					await tx.item.deleteMany({ where: { activityVersionId: draft.id } });
					versionId = draft.id;
				} else {
					const last = await tx.activityVersion.findFirst({
						where: { activityId },
						orderBy: { versionNumber: 'desc' }
					});
					const created = await tx.activityVersion.create({
						data: { activityId, versionNumber: (last?.versionNumber ?? 0) + 1 }
					});
					versionId = created.id;
				}

				await tx.item.createMany({
					data: items.map((item, index) => ({
						sourceContentId: item.sourceContentId,
						generatedBy: item.generatedBy,
						order: index,
						prompt: item.prompt as unknown as Prisma.InputJsonValue,
						interaction: item.interaction as unknown as Prisma.InputJsonValue,
						grading: item.grading as unknown as Prisma.InputJsonValue,
						locale: item.locale as unknown as Prisma.InputJsonValue,
						activityVersionId: versionId
					}))
				});

				return tx.activityVersion.findUniqueOrThrow({
					where: { id: versionId },
					include: { items: { orderBy: { order: 'asc' } } }
				});
			});
		},

		/**
		 * Descarta ou restaura um item do rascunho. O item NÃO é apagado: fica
		 * marcado e some da publicação, para o professor poder voltar atrás na
		 * própria tela de revisão. Item de versão publicada nunca é tocado.
		 */
		async setDraftItemDiscarded(
			activityId: string,
			itemId: string,
			discarded: boolean
		): Promise<boolean> {
			const draft = await this.draft(activityId);
			if (!draft) return false;
			const { count } = await prisma.item.updateMany({
				where: { id: itemId, activityVersionId: draft.id },
				data: { discarded }
			});
			return count > 0;
		},

		/** Restaura todos de uma vez — o "Aceitar todos" da etapa de revisão. */
		async acceptAllDraftItems(activityId: string): Promise<number> {
			const draft = await this.draft(activityId);
			if (!draft) return 0;
			const { count } = await prisma.item.updateMany({
				where: { activityVersionId: draft.id, discarded: true },
				data: { discarded: false }
			});
			return count;
		},

		/**
		 * Item escrito do zero (nível 3 de autoria). Nasce como `cloze` porque é
		 * a interação com o formulário mais simples de preencher — o professor
		 * troca no editor se quiser outra.
		 *
		 * O conteúdo é um MARCADOR, não vazio: `clozeAuthoringSchema` exige
		 * `masked` e `accepted` não vazios, e um item que não valida rebenta em
		 * `toRuntime()` — ou seja, na prévia e no browser do aluno. Melhor nascer
		 * com um texto que grita "me edite" do que com um payload inválido.
		 */
		async createManualDraftItem(activityId: string, locale: { source: string; target: string }) {
			const draft = await this.draft(activityId);
			if (!draft) return null;
			const ultimo = await prisma.item.findFirst({
				where: { activityVersionId: draft.id },
				orderBy: { order: 'desc' },
				select: { order: true }
			});
			return prisma.item.create({
				data: {
					sourceContentId: null,
					generatedBy: null,
					order: (ultimo?.order ?? -1) + 1,
					prompt: { kind: 'text', instructionKey: 'fill-the-blank' },
					interaction: {
						type: 'cloze',
						payload: { masked: 'Escreva a frase e marque a lacuna com ___', accepted: ['resposta'] }
					},
					grading: { mode: 'tolerant', tolerance: 0.9 },
					locale,
					activityVersionId: draft.id
				}
			});
		},

		/**
		 * Publica o rascunho: cria a `Publication` que congela aquela versão.
		 * A versão anterior continua existindo e quem está respondendo nela
		 * termina nela (regra inviolável nº 7).
		 *
		 * **Publicar de novo move o link.** `Publication.slug` é único no
		 * produto inteiro, então republicar com o mesmo endereço estourava
		 * `Unique constraint failed on Publication_slug_key` — o professor
		 * clicava, nada acontecia, e a atividade ficava com uma versão a mais
		 * sem publicação nenhuma. A publicação anterior NÃO é apagada (as
		 * tentativas apontam para ela): o slug dela vira `<slug>~<versão>`,
		 * que nenhum professor consegue escolher (o slug dele é
		 * `^[a-z0-9-]+$`, sem `~`), e o endereço público passa para a
		 * publicação nova. Quem está respondendo agora não sente nada: o
		 * Player resolve a questão pelo `attemptId`, não pelo slug.
		 */
		async publishDraft(activityId: string, slug: string, settings: Prisma.InputJsonValue) {
			const draft = await this.draft(activityId);
			if (!draft) return null;

			// O que o professor descartou não vai para a versão publicada. Aqui
			// eles somem de vez: a versão publicada é imutável, então não faz
			// sentido carregar item morto nela (regra inviolável nº 7).
			await prisma.item.deleteMany({ where: { activityVersionId: draft.id, discarded: true } });

			return prisma.$transaction(async (tx) => {
				const anterior = await tx.publication.findUnique({
					where: { slug },
					include: { activityVersion: { select: { activityId: true, versionNumber: true } } }
				});

				// O endereço sai do id da atividade, então isto não deveria
				// acontecer nunca. Se acontecer, não roube o link de ninguém.
				if (anterior && anterior.activityVersion.activityId !== activityId) {
					return null;
				}

				if (anterior) {
					await tx.publication.update({
						where: { id: anterior.id },
						data: { slug: `${slug}~${anterior.activityVersion.versionNumber}` }
					});
				}

				return tx.publication.create({
					data: { slug, settings, activityVersionId: draft.id }
				});
			});
		},

		/** Um item específico do rascunho, para o editor de item (nível 3). */
		async draftItem(activityId: string, itemId: string) {
			const draft = await this.draft(activityId);
			if (!draft) return null;
			return prisma.item.findFirst({ where: { id: itemId, activityVersionId: draft.id } });
		},

		/** Edição manual (nível 3). Só vale no rascunho. */
		async updateDraftItem(
			activityId: string,
			itemId: string,
			data: {
				prompt: Prisma.InputJsonValue;
				interaction: Prisma.InputJsonValue;
				grading: Prisma.InputJsonValue;
			}
		) {
			const draft = await this.draft(activityId);
			if (!draft) return null;
			const { count } = await prisma.item.updateMany({
				where: { id: itemId, activityVersionId: draft.id },
				data
			});
			return count > 0 ? prisma.item.findUnique({ where: { id: itemId } }) : null;
		}
	};
}
