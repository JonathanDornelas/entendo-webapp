import { z } from 'zod';
import { normalize } from '../language/normalize';
import { sequenceScore } from '../grading/compare';
import { assignRuntimeIds } from '../random';
import { promptSkills } from './skills';
import type { AssembleRuntime, InteractionType } from './types';

/**
 * Montar frase a partir de tokens. `tokens` é a frase certa na ordem certa;
 * `distractors` sempre vem de OUTRAS frases do mesmo lote de conteúdo, nunca
 * de dicionário (kernel.md "Distratores"). `accepted` guarda a sequência
 * principal mais variantes de ordem que também valem.
 */

export const assembleAuthoringSchema = z.object({
	tokens: z.array(z.string().min(1)).min(1),
	distractors: z.array(z.string().min(1)).default([]),
	accepted: z.array(z.array(z.string().min(1))).min(1),
	translation: z.string().optional() // legenda de apoio mostrada ao lado — não é gabarito
});

export const assembleAnswerSchema = z.object({ sequence: z.array(z.string()) });

export type AssemblePayload = z.infer<typeof assembleAuthoringSchema>;
export type AssembleAnswer = z.infer<typeof assembleAnswerSchema>;

// Token e distrator entram no MESMO sorteio antes de ganhar id: se o id
// viesse da ordem de autoria, o intervalo dele já diria quais tokens são os
// verdadeiros.
function bank(payload: AssemblePayload, seed: string) {
	return assignRuntimeIds([...payload.tokens, ...payload.distractors], seed, 'tk');
}

export const assemble: InteractionType<
	typeof assembleAuthoringSchema,
	typeof assembleAnswerSchema,
	AssembleRuntime
> = {
	id: 'assemble',
	authoringSchema: assembleAuthoringSchema,
	answerSchema: assembleAnswerSchema,

	toRuntime: (payload, seed) => ({
		tokens: bank(payload, seed).map((t) => ({ id: t.id, text: t.text })),
		translation: payload.translation
	}),

	grade: (payload, answer, profile, seed) => {
		const byId = new Map(bank(payload, seed).map((t) => [t.id, t.text]));

		const words: string[] = [];
		// Os rótulos ficam no texto ORIGINAL: é o que o aluno tem na tela. As
		// palavras normalizadas servem só para comparar (regra inviolável nº 6).
		const rotulos: string[] = [];
		for (const id of answer.sequence) {
			const text = byId.get(id);
			if (text === undefined) return { ok: false, error: `id de token desconhecido: ${id}` };
			words.push(normalize(text, profile));
			rotulos.push(text);
		}

		const accepted = payload.accepted.map((seq) => seq.map((w) => normalize(w, profile)));
		// Com os rótulos, a correção volta MARCADA: a tela grifa a palavra fora
		// de lugar dentro da frase que ele montou, em vez de contar posições. E
		// com o esperado, ela mostra logo abaixo como a frase deveria ficar — a
		// principal das `accepted`, que é a que o professor escreveu.
		return {
			ok: true,
			value: sequenceScore(words, accepted, rotulos, payload.accepted[0])
		};
	},

	skills: promptSkills
};
