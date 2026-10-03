import type { LanguageProfile } from '../profile';
import { pinyin } from '../teclados';

/**
 * Chinês mandarim, em caracteres simplificados.
 *
 * **Sem espaço entre palavras** — regra inviolável nº 5. Quem separa é o
 * `Intl.Segmenter` de `tokenize`, e `split(' ')` aqui devolveria a frase inteira
 * como um token só (o que faz a régua de palavras do `tolerant` nunca sair de 0
 * ou 1 — ver kernel.md "Correção").
 *
 * **`diacritics` é `significant` por causa do PINYIN.** O han não tem marca
 * combinante nenhuma, então para uma frase em caracteres os dois valores dariam
 * no mesmo. Mas o professor pode escrever pinyin com tom, e aí `tolerant`
 * descartaria o tom: `nǐ`, `ní` e `nì` viravam a mesma resposta. Tom é fonêmico
 * em mandarim — são palavras diferentes, não sotaque.
 *
 * **`lowercase` entra por causa do pinyin**, que é resposta de verdade desde
 * que o teclado de pinyin existe (a transcrição o põe no gabarito — `escrita.ts`).
 * O han não tem caixa, mas `Wǒ` no começo da frase é o mesmo `wǒ`.
 *
 * **`strip-space`**: espaço não separa palavra em chinês, e no pinyin a divisão
 * em palavras varia de livro para livro (`wǒ shì xuéshēng`, `wǒshì xuéshēng`).
 * Nenhuma das duas pode custar nada.
 *
 * **Simplificado contra tradicional não entra em `equivalences`**: kernel.md
 * manda tratar isso como resposta alternativa aceita, que é decisão do
 * professor — o kernel não tem a tabela de conversão e não deve ter.
 */
export const zhCN: LanguageProfile = {
	tag: 'zh-CN',
	direction: 'ltr',
	segmentation: 'icu-word',
	normalizers: ['nfkc', 'lowercase', 'strip-punct', 'strip-space'],
	diacritics: 'significant',
	caseSensitive: false,
	/**
	 * PENDÊNCIA: corte por nota não aplicado (kernel.md) — nenhuma nota do Kokoro
	 * verificada. É o catálogo de `lang_code: 'z'` do `audiotext-service`.
	 */
	tts: {
		voices: [
			'zf_xiaobei',
			'zf_xiaoni',
			'zf_xiaoxiao',
			'zf_xiaoyi',
			'zm_yunjian',
			'zm_yunxi',
			'zm_yunxia',
			'zm_yunyang'
		],
		speeds: [1, 0.75]
	},
	asr: { model: 'zh-CN', hints: [] },
	// Hanzi não se digita sem IME; pinyin sim. O teclado é de pinyin, e a
	// transcrição põe o pinyin da frase entre as respostas aceitas — `我们还没决定`
	// aceita `wǒmen hái méi juédìng` (`escrita.ts`).
	input: { modo: 'grade', teclado: pinyin, transcricao: 'pinyin' },
	/**
	 * Vazio pela mesma razão do japonês: sem espaço entre palavras não existe
	 * fronteira para a troca. `aplicarEquivalencias` casa a variante só quando os
	 * vizinhos NÃO são letra nem número, e em texto han todo vizinho é letra —
	 * então nenhum grupo pegaria, e listá-los daria a impressão de uma cobertura
	 * que não existe.
	 */
	equivalences: []
};
