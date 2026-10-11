import { prisma } from '$lib/server/db/client';
import { publicationSettingsSchema } from '$lib/server/player/settings';
import { labelForTag } from '$lib/kernel/language/profiles';
import { nivelOuNulo } from '$lib/atividades/nivel';
import { lerProgramacao } from '$lib/modulos/programacao';
import { rotuloDoInstante } from '$lib/modulos/estado';
import type { EstadoDaFase, Fase, MapaDoModulo } from '$lib/modulos/mapa';

/**
 * Os MAPAS de módulo de um aluno com conta (docs/telas-modulos-aluno.md).
 *
 * **Escopo pela conta da SESSÃO**, nunca por um id do corpo do pedido
 * (server.md): o mapa existe para as fichas de chamada ligadas à conta logada
 * (`Student.accountId`, que só se liga pelo token do convite — auth.md), e só
 * para os módulos alocados às turmas dessas fichas. Quem responde pelo link
 * aberto, sem conta, não tem mapa — e isso é o caminho normal, não uma falha.
 *
 * **Nada de outro aluno, e nada novo coletado.** O progresso sai das tentativas
 * que já existem, desta ficha ou desta conta. Onde o professor desligou o
 * resultado, o acerto não sai daqui (`acerto: null`).
 */

type Conta = { id: string };

const MODULO = {
	select: {
		id: true,
		name: true,
		teacher: { select: { name: true } },
		activities: {
			orderBy: { position: 'asc' as const },
			select: {
				activity: {
					select: {
						id: true,
						title: true,
						level: true,
						targetLang: true,
						archivedAt: true,
						versions: {
							orderBy: { versionNumber: 'desc' as const },
							take: 1,
							select: { _count: { select: { items: true } } }
						}
					}
				}
			}
		}
	}
};

type Alocacao = Awaited<ReturnType<typeof buscarAlocacoes>>[number];

async function buscarAlocacoes(classroomIds: string[], moduleId?: string) {
	return prisma.moduleClassroom.findMany({
		where: { classroomId: { in: classroomIds }, ...(moduleId ? { moduleId } : {}) },
		orderBy: { createdAt: 'asc' },
		select: {
			id: true,
			schedule: true,
			classroomId: true,
			classroom: { select: { name: true } },
			module: MODULO,
			sends: { select: { activityId: true, status: true, dueAt: true } }
		}
	});
}

/** O nível que mais aparece nas fases ("A2"), para o subtítulo do mapa. */
function nivelMaisComum(niveis: (string | null)[]): string | null {
	const conta = new Map<string, number>();
	for (const n of niveis) if (n) conta.set(n, (conta.get(n) ?? 0) + 1);
	let melhor: string | null = null;
	for (const [n, q] of conta) if (!melhor || q > (conta.get(melhor) ?? 0)) melhor = n;
	return melhor;
}

async function montarMapa(conta: Conta, fichaId: string, a: Alocacao): Promise<MapaDoModulo> {
	const programacao = lerProgramacao(a.schedule);
	const fora = new Set(programacao?.fora ?? []);
	const envioDe = new Map(a.sends.map((s) => [s.activityId, s]));
	// O mapa é o módulo DESTA turma: o que o professor desmarcou ou pulou para
	// ela não aparece.
	const visiveis = a.module.activities
		.map((x) => x.activity)
		.filter((x) => !fora.has(x.id) && envioDe.get(x.id)?.status !== 'pulada');
	const ids = visiveis.map((x) => x.id);

	const [convites, tentativas] = await Promise.all([
		prisma.invite.findMany({
			where: {
				studentId: fichaId,
				delivery: {
					classroomId: a.classroomId,
					publication: { activityVersion: { activityId: { in: ids } } }
				}
			},
			orderBy: { createdAt: 'desc' },
			select: {
				token: true,
				delivery: {
					select: { publication: { select: { activityVersion: { select: { activityId: true } } } } }
				}
			}
		}),
		prisma.attempt.findMany({
			where: {
				OR: [{ studentId: fichaId }, { accountId: conta.id }],
				publication: { activityVersion: { activityId: { in: ids } } }
			},
			orderBy: { startedAt: 'desc' },
			select: {
				finishedAt: true,
				items: { select: { score: true } },
				publication: {
					select: {
						slug: true,
						settings: true,
						activityVersion: { select: { activityId: true } }
					}
				}
			}
		})
	]);

	// O convite mais recente de cada atividade — o link pessoal, que liga a
	// tentativa à ficha e faz a fase contar no mapa.
	const tokenDe = new Map<string, string>();
	for (const c of convites) {
		const id = c.delivery.publication.activityVersion.activityId;
		if (!tokenDe.has(id)) tokenDe.set(id, c.token);
	}

	const fases: Fase[] = visiveis.map((x) => {
		const daqui = tentativas.filter((t) => t.publication.activityVersion.activityId === x.id);
		const terminadas = daqui.filter((t) => t.finishedAt);
		const comeco = daqui.find((t) => !t.finishedAt);
		const token = tokenDe.get(x.id);
		const envio = envioDe.get(x.id);

		let estado: EstadoDaFase;
		let href: string | null = null;
		let acerto: number | null = null;
		if (terminadas.length > 0) {
			estado = 'done';
			href = `/a/${terminadas[0].publication.slug}/resultado`;
			for (const t of terminadas) {
				const settings = publicationSettingsSchema.parse(t.publication.settings);
				if (!settings.showResult || t.items.length === 0) continue;
				const certas = t.items.filter((i) => i.score >= 1).length;
				const pct = Math.round((certas / t.items.length) * 100);
				if (acerto === null || pct > acerto) acerto = pct;
			}
		} else if (comeco) {
			estado = 'doing';
			href = token ? `/e/${token}` : `/a/${comeco.publication.slug}`;
		} else if (x.archivedAt) {
			estado = 'closed';
		} else if (token) {
			estado = 'open';
			href = `/e/${token}`;
		} else {
			estado = 'locked';
		}

		return {
			id: x.id,
			titulo: x.title,
			nivel: nivelOuNulo(x.level),
			questoes: x.versions[0]?._count.items ?? 0,
			estado,
			abre:
				estado === 'locked' && envio?.status === 'programada'
					? rotuloDoInstante(envio.dueAt)
					: null,
			acerto,
			href
		};
	});

	const idioma = visiveis[0] ? labelForTag(visiveis[0].targetLang) : '';
	const nivel = nivelMaisComum(visiveis.map((x) => nivelOuNulo(x.level)));
	return {
		id: a.module.id,
		nome: a.module.name,
		professor: a.module.teacher.name,
		turma: a.classroom.name,
		contexto: [idioma, nivel].filter(Boolean).join(' · '),
		fases
	};
}

export function mapasDoAluno(conta: Conta) {
	async function fichas() {
		return prisma.student.findMany({
			where: { accountId: conta.id },
			select: { id: true, classroomId: true }
		});
	}

	return {
		/** Todos os módulos das turmas desta conta — o bloco "Seus módulos". */
		async todos(): Promise<MapaDoModulo[]> {
			const minhas = await fichas();
			if (minhas.length === 0) return [];
			const fichaDaTurma = new Map(minhas.map((f) => [f.classroomId, f.id]));
			const alocacoes = await buscarAlocacoes([...fichaDaTurma.keys()]);
			// O mesmo módulo alocado a duas turmas da pessoa aparece uma vez só.
			const vistos = new Set<string>();
			const mapas: MapaDoModulo[] = [];
			for (const a of alocacoes) {
				if (vistos.has(a.module.id)) continue;
				vistos.add(a.module.id);
				mapas.push(await montarMapa(conta, fichaDaTurma.get(a.classroomId) as string, a));
			}
			return mapas;
		},

		/**
		 * Um módulo, ou `null` se nenhuma turma desta conta o tem — a tela responde
		 * 404. `mundo` é a posição dele entre os módulos da pessoa ("MUNDO 2").
		 */
		async um(moduleId: string): Promise<{ mapa: MapaDoModulo; mundo: number } | null> {
			const minhas = await fichas();
			if (minhas.length === 0) return null;
			const fichaDaTurma = new Map(minhas.map((f) => [f.classroomId, f.id]));
			const ordem = await prisma.moduleClassroom.findMany({
				where: { classroomId: { in: [...fichaDaTurma.keys()] } },
				orderBy: { createdAt: 'asc' },
				select: { moduleId: true }
			});
			const modulosNaOrdem = [...new Set(ordem.map((o) => o.moduleId))];
			const [a] = await buscarAlocacoes([...fichaDaTurma.keys()], moduleId);
			if (!a) return null;
			return {
				mapa: await montarMapa(conta, fichaDaTurma.get(a.classroomId) as string, a),
				mundo: modulosNaOrdem.indexOf(moduleId) + 1
			};
		}
	};
}

/**
 * A PRÉVIA do professor ("Ver como o aluno vê"): o mapa com a programação de
 * UMA turma e nenhum progresso de aluno. Enviada vira liberada; programada,
 * trancada com a data. Escopado pelo dono do módulo.
 */
export async function previaDoMapa(
	teacherId: string,
	allocationId: string
): Promise<MapaDoModulo | null> {
	const a = await prisma.moduleClassroom.findFirst({
		where: { id: allocationId, module: { teacherId } },
		select: {
			id: true,
			schedule: true,
			classroomId: true,
			classroom: { select: { name: true } },
			module: MODULO,
			sends: { select: { activityId: true, status: true, dueAt: true } }
		}
	});
	if (!a) return null;
	const programacao = lerProgramacao(a.schedule);
	const fora = new Set(programacao?.fora ?? []);
	const envioDe = new Map(a.sends.map((s) => [s.activityId, s]));
	const visiveis = a.module.activities
		.map((x) => x.activity)
		.filter((x) => !fora.has(x.id) && envioDe.get(x.id)?.status !== 'pulada');
	const idioma = visiveis[0] ? labelForTag(visiveis[0].targetLang) : '';
	const nivel = nivelMaisComum(visiveis.map((x) => nivelOuNulo(x.level)));
	return {
		id: a.module.id,
		nome: a.module.name,
		professor: a.module.teacher.name,
		turma: a.classroom.name,
		contexto: [idioma, nivel].filter(Boolean).join(' · '),
		fases: visiveis.map((x) => {
			const envio = envioDe.get(x.id);
			const estado: EstadoDaFase = x.archivedAt
				? 'closed'
				: envio?.status === 'enviada'
					? 'open'
					: 'locked';
			return {
				id: x.id,
				titulo: x.title,
				nivel: nivelOuNulo(x.level),
				questoes: x.versions[0]?._count.items ?? 0,
				estado,
				abre:
					estado === 'locked' && envio?.status === 'programada'
						? rotuloDoInstante(envio.dueAt)
						: null,
				acerto: null,
				href: null
			};
		})
	};
}
