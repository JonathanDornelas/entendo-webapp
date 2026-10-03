import type { LanguageProfile } from './profile';

/**
 * Nunca `split(' ')` para tokenizar — regra inviolável nº 5. Japonês, chinês
 * e tailandês não separam palavras por espaço.
 */
export function tokenize(text: string, profile: Pick<LanguageProfile, 'tag'>): string[] {
	const segmenter = new Intl.Segmenter(profile.tag, { granularity: 'word' });
	return [...segmenter.segment(text)]
		.filter((segment) => segment.isWordLike)
		.map((segment) => segment.segment);
}

/**
 * As palavras COM a posição de cada uma no texto (em unidades UTF-16, como o
 * `slice`), e também o que não é palavra (pontuação, espaço) — para quem precisa
 * achar um trecho dentro da frase, como a lacuna de um `cloze`. Mesma regra nº 5:
 * a fronteira é a do `Intl.Segmenter` do idioma, nunca o espaço.
 */
export function segmentosDePalavra(
	text: string,
	profile: Pick<LanguageProfile, 'tag'>
): { texto: string; inicio: number; palavra: boolean }[] {
	const segmenter = new Intl.Segmenter(profile.tag, { granularity: 'word' });
	return [...segmenter.segment(text)].map((s) => ({
		texto: s.segment,
		inicio: s.index,
		palavra: s.isWordLike ?? false
	}));
}

/**
 * Quantos CARACTERES o leitor VÊ. Não é `text.length`: aquilo conta unidades
 * UTF-16, então um emoji vale 2 e um "ê" decomposto vale 2 — e é isso que
 * dimensiona a lacuna do `cloze`.
 *
 * Sem locale de propósito, e isso NÃO é a regra nº 5 pela porta dos fundos:
 * a fronteira de grafema do Unicode é a mesma em toda língua (UAX #29), quem
 * depende de idioma é a de PALAVRA — essa continua exigindo o profile, logo
 * acima.
 */
export function graphemeCount(text: string): number {
	const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
	return [...segmenter.segment(text)].length;
}
