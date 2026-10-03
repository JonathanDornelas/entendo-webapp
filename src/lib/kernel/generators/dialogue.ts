import type { Dialogue } from '../content/types';
import type { Item } from '../item';
import type { Generator } from './types';

/**
 * `Dialogue` — kernel.md lista `order-lines`, `listen-dialogue-choice` e
 * `roleplay-speak`. Este arquivo implementa `order-lines`; os outros dois
 * estão em "O que falta" de paginas.md.
 */
export const orderLines: Generator<Dialogue> = {
	id: 'order-lines',
	generate: (content, ctx) => {
		const lines = content.data.lines.map((l) => l.text);
		// Duas falas já dão exercício; uma só, não.
		if (lines.length < 2) return [];

		const item: Item = {
			id: `${content.id}:order-lines`,
			sourceContentId: content.id,
			generatedBy: 'order-lines',
			// Sem `text`: o enunciado é só a instrução, e o conteúdo (as falas
			// na ordem certa) é gabarito — vai no payload da interação, que
			// `toRuntime` embaralha.
			prompt: { kind: 'text', instructionKey: 'order-the-lines' },
			interaction: { type: 'order', payload: { lines } },
			grading: { mode: 'sequence' },
			locale: { source: ctx.sourceProfile.tag, target: ctx.targetProfile.tag }
		};
		return [item];
	}
};

export const dialogueGenerators: Generator<Dialogue>[] = [orderLines];
