/**
 * Toda especificidade de idioma vive aqui — ver .claude/rules/kernel.md
 * "LanguageProfile". Perfis concretos entram em `kernel/language/profiles/`
 * (skill `novo-idioma`). Se você está escrevendo `if (lang === 'ja')` fora
 * deste arquivo e de um `LanguageProfile`, está errado.
 */

import type { EntradaDoIdioma } from './teclado';

export type Normalizer = 'nfkc' | 'lowercase' | 'strip-punct' | 'strip-space';

export interface LanguageProfile {
	tag: string; // 'ja-JP'
	direction: 'ltr' | 'rtl';
	segmentation: 'icu-word' | 'icu-grapheme';
	normalizers: Normalizer[];
	diacritics: 'significant' | 'tolerant';
	caseSensitive: boolean;
	/**
	 * `voices` é uma LISTA, e a ordem importa pouco — o que importa é ter mais de
	 * uma. Uma atividade inteira na mesma voz treina o aluno a entender AQUELA
	 * pessoa; trocar entre as frases é o mais perto de sala de aula que dá
	 * para chegar sem gravar gente de verdade. Qual voz cada frase usa é
	 * decidido por `vozDoTexto` (`language/voice.ts`), de forma determinística.
	 *
	 * **Lista vazia significa SEM ÁUDIO neste idioma** — o gerador não produz
	 * item de escuta, em vez de enfileirar um TTS que o provedor vai recusar e
	 * deixar a publicação travada para sempre.
	 *
	 * `speeds` continua sendo os ARQUIVOS sintetizados (normal e reduzida). Os
	 * degraus intermediários do player saem de `playbackRate` — ver
	 * `AudioPlayer.svelte`.
	 */
	tts: { voices: string[]; speeds: number[] };
	asr: { model: string; hints: string[] };
	/**
	 * Como o aluno DIGITA neste idioma — ver `teclado.ts` para os quatro modos.
	 *
	 * Existe porque o aluno responde num aparelho cujo teclado é o dele, não o do
	 * idioma: quem estuda árabe não tem tecla de `ع`, e quem estuda francês tem
	 * as letras mas não o `ç`. O Player mostra o teclado que este campo pedir.
	 *
	 * **`ime` é o modo que o GERADOR lê.** Japonês e chinês não se digitam com
	 * teclado nenhum — pedem conversão —, então ali os geradores que exigiriam
	 * digitar no idioma alvo não produzem item, e a mesma frase vira "montar a
	 * frase" (`assemble`), que não precisa de teclado.
	 */
	input: EntradaDoIdioma;
	/**
	 * Formas que a língua trata como A MESMA COISA na correção. Cada grupo é uma
	 * lista de formas já normalizadas (minúsculas, sem pontuação, um espaço
	 * entre palavras); a primeira é a canônica, e o normalizador troca as outras
	 * por ela antes de qualquer comparação — então as duas pontas viram o mesmo
	 * texto e nenhuma régua vê diferença.
	 *
	 * Dois usos, e é por eles que isto existe:
	 *
	 * - **Numerais.** O ASR escreve "7" onde o aluno disse "seven", e a frase
	 *   alvo tem "seven": era um "quase — repare em seven" por um acerto. Os
	 *   grupos `['7', 'seven']` (`numerais()`, em `equivalences.ts`) fecham isso.
	 * - **Formas intercambiáveis da própria língua.** "vai trabalhar" e "irá
	 *   trabalhar" dizem o mesmo; "I'm" e "I am" também. O kernel não sabe
	 *   sinônimo e não pode fingir que sabe — mas o PROFILE pode listar as
	 *   poucas formas gramaticais que são a mesma palavra escrita de outro jeito.
	 *
	 * É a única lista de "sinônimos" do produto, e é curta de propósito: cada
	 * entrada é uma decisão de que o professor NÃO quer distinguir aquelas
	 * formas. Sinônimo de vocabulário continua sendo "Respostas aceitas", que o
	 * professor cadastra.
	 */
	equivalences: string[][];
}
