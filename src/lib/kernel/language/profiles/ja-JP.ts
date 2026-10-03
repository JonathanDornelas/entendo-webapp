import type { LanguageProfile } from '../profile';
import { kana } from '../teclados';

/**
 * Japonês — sem espaço entre palavras (regra inviolável nº 5, `tokenize` usa
 * `Intl.Segmenter` para isto) e sem distinção de maiúscula/minúscula, então
 * `lowercase` fica fora dos normalizers: não tem efeito e só confundiria.
 *
 * **`diacritics` é `significant`, e isto foi um BUG corrigido.** O profile
 * nascera `tolerant` — o valor certo para inglês, onde o acento é enfeite de
 * empréstimo. Em japonês o dakuten NÃO é enfeite: ele é parte do kana, e
 * `tolerant` o descartava (ele é marca combinante na decomposição). O efeito,
 * medido:
 *
 * - `が` virava `か`, e `がっこう` (escola) virava `かっこう`
 * - `ば` e `ぱ` viravam as DUAS `は` — ou seja, comparavam iguais entre si
 * - o mesmo em katakana: `ガ` virava `カ`
 *
 * Na prática o aluno que escrevia `かっこう` onde a resposta era `がっこう` era
 * aprovado, e `はん`/`ばん`/`ぱん` eram a mesma resposta. Não havia ganho nenhum
 * do outro lado: o IME do aparelho produz o dakuten, e o teclado de kana
 * também (a tecla `゛`) — não existe o caso "não tenho a tecla", que é o que
 * justifica `tolerant` no inglês.
 *
 * O NFKC continua fazendo o trabalho que o japonês realmente precisa: meia
 * largura vira largura cheia (`ｶ` → `カ`).
 *
 * **O teclado é o de kana** (`teclados.ts`), e ele não escreve kanji. Quem
 * torna a questão respondível é a transcrição `kana`: o servidor lê a frase
 * (`明日友達に会います` → `あしたともだちにあいます`) e a leitura entra entre
 * as respostas aceitas (`escrita.ts`). Sem leitura possível, o gerador corta a
 * questão de digitar (`alcance.ts`) e a frase segue por "montar a frase".
 */
export const jaJP: LanguageProfile = {
	tag: 'ja-JP',
	direction: 'ltr',
	segmentation: 'icu-word',
	normalizers: ['nfkc', 'strip-punct', 'strip-space'],
	diacritics: 'significant',
	caseSensitive: false,
	// Ordenadas pela nota do Kokoro (VOICES.md). `jm_kumo` é C- e entra assim
	// mesmo: é a ÚNICA voz masculina japonesa do modelo, e uma atividade só com
	// vozes femininas treina menos o ouvido do que uma com uma voz mediana.
	tts: {
		voices: [
			'jf_alpha', // C+
			'jf_tebukuro', // C
			'jf_gongitsune', // C
			'jm_kumo' // C-
		],
		speeds: [1, 0.75]
	},
	asr: { model: 'ja-JP', hints: [] },
	input: { modo: 'grade', teclado: kana, transcricao: 'kana' },
	// Sem espaço entre palavras não há fronteira para a troca — e o ASR de
	// japonês já escreve os numerais como o texto os traz.
	equivalences: []
};
