import type { LanguageProfile } from '../profile';
import { equivalenciasEmIngles } from './en-comum';

/**
 * Inglês britânico. Mesma língua escrita do americano para efeito de correção —
 * o que muda é a VOZ, e é por isso que ele é um profile próprio em vez de uma
 * opção dentro do `en-US`: o Kokoro trata os dois como idiomas diferentes
 * (`lang_code` `a` contra `b`), então a voz de um não sintetiza o outro.
 *
 * **A ortografia que difere de verdade (`colour`/`color`, `realise`/`realize`)
 * NÃO está em `equivalences`.** Igualá-las diria ao aluno de inglês britânico
 * que "color" está certo, que é o oposto do que a atividade ensina. Quando o
 * professor não quiser distinguir, ele cadastra a variante em "Respostas
 * aceitas" (kernel.md) — é decisão dele, não do kernel.
 */
export const enGB: LanguageProfile = {
	tag: 'en-GB',
	direction: 'ltr',
	segmentation: 'icu-word',
	normalizers: ['nfkc', 'lowercase', 'strip-punct'],
	diacritics: 'tolerant',
	caseSensitive: false,
	/**
	 * PENDÊNCIA: o corte por nota (C+ para cima, kernel.md "LanguageProfile")
	 * ainda NÃO foi aplicado aqui — o VOICES.md do Kokoro não está no
	 * repositório e nenhuma nota foi verificada. A lista é o catálogo que o
	 * `audiotext-service` aceita para `lang_code: 'b'` (`app/voices.py`), que é
	 * o mesmo critério que `es-ES` e `pt-BR` seguem hoje.
	 */
	tts: {
		voices: [
			'bf_emma',
			'bf_alice',
			'bf_isabella',
			'bf_lily',
			'bm_george',
			'bm_fable',
			'bm_daniel',
			'bm_lewis'
		],
		speeds: [1, 0.75]
	},
	asr: { model: 'en-GB', hints: [] },
	input: { modo: 'nativo' },
	equivalences: equivalenciasEmIngles
};
