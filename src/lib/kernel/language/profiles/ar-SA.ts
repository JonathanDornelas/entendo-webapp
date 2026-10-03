import type { LanguageProfile } from '../profile';
import { arabe } from '../teclados';

/**
 * Árabe — RTL desde o início (design-system.md "Direção do texto"). As
 * marcas de vogal (tashkeel) são normalmente omitidas na escrita cotidiana,
 * então `diacritics` fica `tolerant`.
 */
export const arSA: LanguageProfile = {
	tag: 'ar-SA',
	direction: 'rtl',
	segmentation: 'icu-word',
	normalizers: ['nfkc', 'strip-punct'],
	diacritics: 'tolerant',
	caseSensitive: false,
	// **O modelo de TTS não fala árabe.** Lista vazia é a resposta honesta: sem
	// voz não há item de escuta, e a atividade sai com o que dá para entregar —
	// em vez de travar em "gerando áudio" esperando um arquivo que nunca vem.
	tts: { voices: [], speeds: [1, 0.75] },
	asr: { model: 'ar-SA', hints: [] },
	input: { modo: 'grade', teclado: arabe },
	equivalences: []
};
