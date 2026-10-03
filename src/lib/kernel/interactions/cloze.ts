import { z } from 'zod';
import { tolerantScore } from '../grading/compare';
import { graphemeCount } from '../language/tokenize';
import { promptSkills } from './skills';
import type { InteractionType, TextRuntime } from './types';

/**
 * Completar a lacuna. É `type` com a frase mascarada visível — a mecânica de
 * correção é a mesma (tolerante, com parcial), o que muda é o que o aluno vê.
 * `masked` é conteúdo público; `accepted` é gabarito e nunca sai do servidor.
 */

export const clozeAuthoringSchema = z.object({
	masked: z.string().min(1), // ex.: "She ___ ___ working here since 2019."
	accepted: z.array(z.string().min(1)).min(1)
});

export const clozeAnswerSchema = z.object({ text: z.string() });

export type ClozePayload = z.infer<typeof clozeAuthoringSchema>;
export type ClozeAnswer = z.infer<typeof clozeAnswerSchema>;

/**
 * A largura de cada lacuna, em caracteres. É o que faz a lacuna ter o tamanho
 * da palavra que falta em vez de um "___" genérico do mesmo tamanho para
 * "a" e para "extraordinariamente".
 *
 * Com mais de uma lacuna a medida é REPARTIDA em partes iguais, não recortada
 * palavra a palavra: dividir a resposta por espaço é a regra inviolável nº 5,
 * e um idioma sem espaço (japonês, chinês, tailandês) devolveria uma lacuna só
 * do tamanho da frase inteira. Aproximar é honesto; tokenizar errado, não.
 */
function blankWidths(payload: ClozePayload): number[] {
	const lacunas = payload.masked.match(/_{2,}/g)?.length ?? 0;
	if (lacunas === 0) return [];
	const total = graphemeCount(payload.accepted[0] ?? '');
	if (total === 0) return [];
	return Array.from({ length: lacunas }, () => Math.max(2, Math.ceil(total / lacunas)));
}

export const cloze: InteractionType<
	typeof clozeAuthoringSchema,
	typeof clozeAnswerSchema,
	TextRuntime
> = {
	id: 'cloze',
	authoringSchema: clozeAuthoringSchema,
	answerSchema: clozeAnswerSchema,

	toRuntime: (payload) => ({ masked: payload.masked, blanks: blankWidths(payload) }),

	grade: (payload, answer, profile) => ({
		ok: true,
		value: tolerantScore(answer.text, payload.accepted, profile)
	}),

	skills: (prompt) => [...promptSkills(prompt), 'writing']
};
