import { z } from 'zod';
import { tolerantScore } from '../grading/compare';
import { promptSkills } from './skills';
import type { InteractionType, TextRuntime } from './types';

/**
 * Digitar a resposta inteira. Toda questão aceita várias respostas válidas
 * (kernel.md "Respostas aceitas") — resposta única é a maior fonte de
 * frustração em app de idioma.
 *
 * Escrita longa por rubrica (`grading.mode === 'rubric'`) NÃO é um tipo à
 * parte: é este mesmo `type`, só que corrigido fora do kernel — pelo
 * professor, em cima da resposta, na tela da tentativa
 * (`(studio)/resultados/[activityId]/[attemptId]`). Por isso não existe campo
 * de rubrica aqui.
 */

export const typeAuthoringSchema = z.object({
	accepted: z.array(z.string().min(1)).min(1)
});

export const typeAnswerSchema = z.object({ text: z.string() });

export type TypePayload = z.infer<typeof typeAuthoringSchema>;
export type TypeAnswer = z.infer<typeof typeAnswerSchema>;

export const type: InteractionType<
	typeof typeAuthoringSchema,
	typeof typeAnswerSchema,
	TextRuntime
> = {
	id: 'type',
	authoringSchema: typeAuthoringSchema,
	answerSchema: typeAnswerSchema,

	// A UI do Player reusa o componente do cloze, que sempre lê `masked` —
	// aqui não existe lacuna, então vai vazio. Começar de um objeto vazio e
	// adicionar só o necessário é a regra do `toRuntime` (skill nova-interacao).
	toRuntime: () => ({ masked: '' }),

	grade: (payload, answer, profile) => ({
		ok: true,
		value: tolerantScore(answer.text, payload.accepted, profile)
	}),

	skills: (prompt) => [...promptSkills(prompt), 'writing']
};
