import { z } from 'zod';
import { command, form, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { requireTeacher } from '$lib/server/auth/guard';
import { materiais } from '$lib/server/db/repos/content-units';
import { camposMaterial, montarMaterial } from '$lib/server/atividades/material-form';
import { parseRawMaterial } from '$lib/kernel/content/parse-raw';

/**
 * A biblioteca avulsa — material que existe fora de qualquer atividade.
 *
 * **Toda remote function é um endpoint HTTP público** (regra inviolável nº 3):
 * cada uma começa pelo guard, e nenhuma toca o Prisma cru — só o repositório,
 * que injeta o `teacherId` (regra nº 4).
 *
 * É o mesmo `montarMaterial` da etapa 2 do wizard: cadastrar uma frase aqui e
 * cadastrá-la lá tem que produzir exatamente o mesmo `ContentUnit`, senão o
 * "trazer da biblioteca" traria um dado de outra forma.
 */

function teacherOf() {
	return requireTeacher(getRequestEvent().locals);
}

export const criarMaterial = form(z.object(camposMaterial), async (campos) => {
	const teacher = teacherOf();
	const montado = montarMaterial(campos);
	if ('error' in montado) return { ok: false as const, error: montado.error };

	// Igual ao que já existe? Reaproveita — a biblioteca é do professor, e duas
	// linhas com a mesma frase são duas coisas para ele manter em dia sem
	// ganhar nada.
	const equivalente = await materiais(teacher).findEquivalent(campos.kind, montado.dados);
	if (equivalente) return { ok: true as const, id: equivalente, reused: true };

	const criado = await materiais(teacher).create(campos.kind, montado.dados);
	return { ok: true as const, id: criado.id, reused: false };
});

/** Colar uma lista direto na biblioteca — mesmo parser da etapa 2. */
export const criarMateriaisEmLote = form(
	z.object({ kind: z.enum(['SentencePair', 'VocabItem']), raw: z.string() }),
	async ({ kind, raw }) => {
		const teacher = teacherOf();
		const repo = materiais(teacher);

		const linhas = raw.split('\n').filter((linha) => linha.trim()).length;
		const unidades = parseRawMaterial(kind, raw);
		if (unidades.length === 0) {
			return {
				ok: false as const,
				error: 'Nenhuma linha tem o separador. Use "alvo · tradução", um por linha.'
			};
		}

		let criados = 0;
		let reaproveitados = 0;
		for (const dados of unidades) {
			if (await repo.findEquivalent(kind, dados)) {
				reaproveitados++;
				continue;
			}
			await repo.create(kind, dados);
			criados++;
		}
		return {
			ok: true as const,
			added: criados,
			reused: reaproveitados,
			ignored: linhas - unidades.length
		};
	}
);

export const atualizarMaterial = form(
	z.object({ contentId: z.string(), ...camposMaterial }),
	async ({ contentId, ...campos }) => {
		const teacher = teacherOf();
		const montado = montarMaterial(campos);
		if ('error' in montado) return { ok: false as const, error: montado.error };

		const atualizado = await materiais(teacher).update(contentId, campos.kind, montado.dados);
		if (!atualizado) error(404, 'Material não encontrado');
		return { ok: true as const };
	}
);

/**
 * Apagar da BIBLIOTECA. Some dos rascunhos junto (o vínculo é N:N e cai com
 * ele), mas o que está no ar continua intacto: a versão publicada guarda uma
 * cópia congelada (regra nº 7). A tela diz isso antes de perguntar.
 */
export const apagarMaterial = command(
	z.object({ contentId: z.string() }),
	async ({ contentId }) => {
		const teacher = teacherOf();
		return { removed: await materiais(teacher).remove(contentId) };
	}
);
