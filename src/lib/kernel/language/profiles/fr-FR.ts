import type { LanguageProfile } from '../profile';
import { acentosFrances } from '../teclados';
import { numerais } from '../equivalences';

/**
 * Francês. **Acento é SIGNIFICATIVO**, e no francês isso não é formalidade de
 * ortografia: os acentos distinguem palavras diferentes — `ou` (ou) contra `où`
 * (onde), `a` (tem) contra `à` (a/para), `sur` (sobre) contra `sûr` (certo).
 * Com `tolerant` os três pares virariam a mesma resposta e o aluno seria
 * aprovado escrevendo a outra palavra.
 *
 * A cedilha do `ç` também é marca combinante na decomposição, então ela cai no
 * mesmo caso: `ça` e `ca` não podem ser iguais.
 */
export const frFR: LanguageProfile = {
	tag: 'fr-FR',
	direction: 'ltr',
	segmentation: 'icu-word',
	normalizers: ['nfkc', 'lowercase', 'strip-punct'],
	diacritics: 'significant',
	caseSensitive: false,
	/**
	 * PENDÊNCIA: o corte por nota (kernel.md) ainda não foi aplicado — nenhuma
	 * nota do Kokoro foi verificada. `ff_siwis` é a ÚNICA voz francesa do modelo
	 * (`audiotext-service/app/voices.py`), então aqui a lista tem uma só e a
	 * variação de voz entre as frases não acontece neste idioma — é limite do
	 * modelo, não escolha.
	 */
	tts: { voices: ['ff_siwis'], speeds: [1, 0.75] },
	asr: { model: 'fr-FR', hints: [] },
	input: { modo: 'acentos', teclado: acentosFrances },
	equivalences: [
		...numerais(
			[
				'zéro',
				'un|une',
				'deux',
				'trois',
				'quatre',
				'cinq',
				'six',
				'sept',
				'huit',
				'neuf',
				'dix',
				'onze',
				'douze',
				'treize',
				'quatorze',
				'quinze',
				'seize',
				// **Sem hífen, e as duas formas.** `strip-punct` REMOVE o hífen sem
				// pôr espaço no lugar, então "dix-sept" chega à comparação como
				// "dixsept" — escrita com hífen, a variante nunca casaria. "dix sept"
				// entra porque é a forma que sobra quando o hífen não é digitado.
				'dixsept|dix sept',
				'dixhuit|dix huit',
				'dixneuf|dix neuf'
			],
			// 70/80/90 são compostos no francês da França ("soixante-dix"), então
			// eles entram em `extras` em vez da lista de dezenas: combinar
			// "soixante-dix" com uma unidade daria "soixante-dix un", que ninguém
			// escreve.
			['vingt', 'trente', 'quarante', 'cinquante', 'soixante'],
			// O hífen cai na normalização ("vingt-deux" → "vingtdeux"), e o 21 leva
			// "et" ("vingt et un").
			(dezena, unidade) => [
				`${dezena} ${unidade}`,
				`${dezena}${unidade}`,
				`${dezena} et ${unidade}`
			],
			// Mesma regra do hífen aqui: as formas vão coladas ou com espaço, nunca
			// hifenizadas.
			[
				['70', 'soixantedix', 'soixante dix'],
				['80', 'quatrevingts', 'quatre vingts', 'quatrevingt', 'quatre vingt'],
				['90', 'quatrevingtdix', 'quatre vingt dix'],
				['100', 'cent']
			]
		),
		// A elisão é obrigatória na escrita, mas o apóstrofo já caiu no
		// `strip-punct`: "j'ai" chega como "jai". O grupo existe para o aluno que
		// escreve a forma cheia não levar um "quase".
		['je ai', 'jai'],
		['je suis', 'jsuis'],
		['ce est', 'cest'],
		['il y a', 'ya'],
		['ne est pas', 'nest pas'],
		['de le', 'du'],
		['de les', 'des']
	]
};
