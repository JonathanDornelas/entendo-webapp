import type { VocabItem } from '../content/types';
import type { Item } from '../item';
import { distractorPhrases } from './distractors';
import type { Generator } from './types';

/**
 * `VocabItem` — kernel.md lista seis geradores para este tipo
 * (`vocab-choice`, `vocab-image-choice`, `listen-vocab-choice`,
 * `vocab-match`, `vocab-type`, `speak-vocab`). Este arquivo implementa
 * `vocab-choice`; os outros cinco estão em "O que falta" de paginas.md.
 */
export const vocabChoice: Generator<VocabItem> = {
	id: 'vocab-choice',
	generate: (content, ctx) => {
		const distractors = distractorPhrases(
			ctx.siblings.map((s) => s.data.translation),
			content.data.translation,
			3,
			ctx.sourceProfile,
			`${ctx.seed}:${content.id}:vocab-choice`
		);
		// Conjunto pequeno demais gera MENOS exercícios — nunca um distrator
		// inventado (kernel.md "Distratores").
		if (distractors.length < 1) return [];

		const item: Item = {
			id: `${content.id}:vocab-choice`,
			sourceContentId: content.id,
			generatedBy: 'vocab-choice',
			prompt: { kind: 'text', text: content.data.term, instructionKey: 'choose-translation' },
			interaction: {
				type: 'choice',
				payload: { options: [content.data.translation, ...distractors], correctIndex: 0 }
			},
			grading: { mode: 'exact' },
			locale: { source: ctx.sourceProfile.tag, target: ctx.targetProfile.tag }
		};
		return [item];
	}
};

export const vocabItemGenerators: Generator<VocabItem>[] = [vocabChoice];
