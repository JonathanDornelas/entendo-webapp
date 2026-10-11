import { prisma } from '$lib/server/db/client';
import { corOuPadrao, type CorDeEtiqueta } from '$lib/etiquetas';
import { nivelOuNulo } from '$lib/atividades/nivel';

type TeacherScope = { id: string };

/** O que a tela precisa de cada atividade dentro de um módulo. */
const ATIVIDADE_NO_MODULO = {
	id: true,
	title: true,
	level: true,
	targetLang: true,
	archivedAt: true,
	versions: {
		orderBy: { versionNumber: 'desc' as const },
		select: {
			_count: { select: { items: true } },
			publications: { select: { id: true, slug: true }, orderBy: { createdAt: 'desc' as const } }
		}
	}
};

/** No ar = alguma versão tem publicação. Arquivada não conta como no ar. */
function estadoDaAtividade(a: {
	archivedAt: Date | null;
	versions: { publications: unknown[] }[];
}): 'no-ar' | 'rascunho' | 'arquivada' {
	if (a.archivedAt) return 'arquivada';
	return a.versions.some((v) => v.publications.length > 0) ? 'no-ar' : 'rascunho';
}

/**
 * Os MÓDULOS do professor — coleções ordenadas de atividades
 * (docs/adr-004-modulos-e-nivel.md). Escopados por `teacherId` como todo
 * repositório (auth.md "Isolamento entre professores").
 *
 * **Ligar exige as DUAS pontas do professor.** Conferir só o módulo deixaria um
 * POST direto pôr a atividade de outra pessoa no próprio módulo — e daí
 * enviá-la para a própria turma. `adicionar` filtra os ids pelo dono antes de
 * gravar, e devolve quantos entraram de fato.
 */
export function modulos(teacher: TeacherScope) {
	const dono = { teacherId: teacher.id };

	return {
		async list() {
			const linhas = await prisma.module.findMany({
				where: dono,
				orderBy: { updatedAt: 'desc' },
				include: {
					activities: {
						orderBy: { position: 'asc' },
						select: { activity: { select: ATIVIDADE_NO_MODULO } }
					}
				}
			});
			return linhas.map((m) => ({
				id: m.id,
				name: m.name,
				description: m.description,
				color: corOuPadrao(m.color),
				total: m.activities.length,
				noAr: m.activities.filter((x) => estadoDaAtividade(x.activity) === 'no-ar').length,
				/** Na ordem: a sequência numerada do cartão e o "próximo envio" dizem qual sai. */
				atividades: m.activities.map((x) => ({
					id: x.activity.id,
					title: x.activity.title,
					estado: estadoDaAtividade(x.activity)
				})),
				updatedAt: m.updatedAt
			}));
		},

		async byId(id: string) {
			const m = await prisma.module.findFirst({
				where: { id, ...dono },
				include: {
					activities: {
						orderBy: { position: 'asc' },
						select: { position: true, activity: { select: ATIVIDADE_NO_MODULO } }
					},
					_count: { select: { deliveries: true } }
				}
			});
			if (!m) return null;
			return {
				id: m.id,
				name: m.name,
				description: m.description,
				color: corOuPadrao(m.color),
				createdAt: m.createdAt,
				envios: m._count.deliveries,
				atividades: m.activities.map(({ activity: a }) => ({
					id: a.id,
					title: a.title,
					level: nivelOuNulo(a.level),
					targetLang: a.targetLang,
					estado: estadoDaAtividade(a),
					itemCount: a.versions[0]?._count.items ?? 0
				}))
			};
		},

		create(dados: { name: string; description: string | null; color: CorDeEtiqueta }) {
			return prisma.module.create({ data: { ...dados, ...dono } });
		},

		async update(
			id: string,
			dados: { name: string; description: string | null; color: CorDeEtiqueta }
		) {
			const { count } = await prisma.module.updateMany({ where: { id, ...dono }, data: dados });
			return count > 0;
		},

		/** Apaga o módulo. As atividades ficam — só o vínculo cai (Cascade em `ModuleActivity`). */
		async remove(id: string) {
			const { count } = await prisma.module.deleteMany({ where: { id, ...dono } });
			return count > 0;
		},

		/** Acrescenta no FIM, na ordem pedida. Ignora o que já está e o que não é do professor. */
		async adicionar(moduleId: string, activityIds: string[]): Promise<number | null> {
			return prisma.$transaction(async (tx) => {
				const modulo = await tx.module.findFirst({
					where: { id: moduleId, ...dono },
					select: { id: true }
				});
				if (!modulo) return null;
				const minhas = await tx.activity.findMany({
					where: { id: { in: activityIds }, ...dono },
					select: { id: true }
				});
				const permitidas = new Set(minhas.map((a) => a.id));
				const jaDentro = new Set(
					(
						await tx.moduleActivity.findMany({ where: { moduleId }, select: { activityId: true } })
					).map((x) => x.activityId)
				);
				const ultima = await tx.moduleActivity.aggregate({
					where: { moduleId },
					_max: { position: true }
				});
				let posicao = (ultima._max.position ?? -1) + 1;
				const novas = [...new Set(activityIds)].filter(
					(id) => permitidas.has(id) && !jaDentro.has(id)
				);
				if (novas.length > 0) {
					await tx.moduleActivity.createMany({
						data: novas.map((activityId) => ({ moduleId, activityId, position: posicao++ }))
					});
					await tx.module.update({ where: { id: moduleId }, data: { updatedAt: new Date() } });
				}
				return novas.length;
			});
		},

		/**
		 * Uma CÓPIA do módulo: nome com "(cópia)", a mesma descrição, cor e
		 * atividades, na mesma ordem. As turmas e a programação NÃO vêm junto —
		 * duplicar não pode mandar e-mail para ninguém. Devolve o id novo, ou `null`
		 * se o módulo não é do professor.
		 */
		async duplicar(moduleId: string): Promise<string | null> {
			return prisma.$transaction(async (tx) => {
				const original = await tx.module.findFirst({
					where: { id: moduleId, ...dono },
					select: {
						name: true,
						description: true,
						color: true,
						activities: { orderBy: { position: 'asc' }, select: { activityId: true } }
					}
				});
				if (!original) return null;
				const copia = await tx.module.create({
					data: {
						name: `${original.name} (cópia)`.slice(0, 80),
						description: original.description,
						color: original.color,
						...dono
					},
					select: { id: true }
				});
				if (original.activities.length > 0) {
					await tx.moduleActivity.createMany({
						data: original.activities.map((a, position) => ({
							moduleId: copia.id,
							activityId: a.activityId,
							position
						}))
					});
				}
				return copia.id;
			});
		},

		async remover(moduleId: string, activityId: string): Promise<boolean> {
			const { count } = await prisma.moduleActivity.deleteMany({
				where: { moduleId, activityId, module: dono }
			});
			return count > 0;
		},

		/**
		 * Grava a ordem nova. `ids` tem de ser EXATAMENTE o conjunto que já está no
		 * módulo — reordenar não acrescenta nem tira nada, e um id alheio no meio é
		 * recusado inteiro.
		 */
		async reordenar(moduleId: string, ids: string[]): Promise<boolean> {
			return prisma.$transaction(async (tx) => {
				const modulo = await tx.module.findFirst({
					where: { id: moduleId, ...dono },
					select: { id: true }
				});
				if (!modulo) return false;
				const atuais = await tx.moduleActivity.findMany({
					where: { moduleId },
					select: { activityId: true }
				});
				const mesmoConjunto =
					atuais.length === ids.length &&
					new Set(ids).size === ids.length &&
					atuais.every((x) => ids.includes(x.activityId));
				if (!mesmoConjunto) return false;
				for (const [position, activityId] of ids.entries()) {
					await tx.moduleActivity.update({
						where: { moduleId_activityId: { moduleId, activityId } },
						data: { position }
					});
				}
				return true;
			});
		},

		/** Os módulos que contêm esta atividade — os chips do detalhe da atividade. */
		porAtividade(activityId: string) {
			return prisma.module.findMany({
				where: { ...dono, activities: { some: { activityId } } },
				orderBy: { name: 'asc' },
				select: { id: true, name: true, color: true }
			});
		},

		/** Todos os módulos, só id e nome — o seletor "Adicionar a módulo". */
		nomes() {
			return prisma.module.findMany({
				where: dono,
				orderBy: { name: 'asc' },
				select: { id: true, name: true }
			});
		}
	};
}
