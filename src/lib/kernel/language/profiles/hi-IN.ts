import type { LanguageProfile } from '../profile';
import { devanagari } from '../teclados';
import { numerais } from '../equivalences';

/**
 * Híndi, em devanágari.
 *
 * **`diacritics` é `significant`, e aqui isso não é preferência — é corretude.**
 * As matras (sinais de vogal) e o virama do devanágari são marcas combinantes, e
 * `tolerant` as DESCARTA: `कु` ("ku") viraria `क` ("ka"), e `हिन्दी` ("hindi")
 * viraria `हिनदी`, que não é palavra. Pior, palavras diferentes passariam a
 * comparar iguais — a vogal não é enfeite do caractere, ela é parte dele.
 *
 * O detalhe que engana: o devanágari MISTURA as categorias. `ि` (i curto) é
 * marca com espaço (`Mc`) e sobreviveria; `ु` (u curto) é sem espaço (`Mn`) e
 * não. Ou seja, com `tolerant` o estrago seria SELETIVO — algumas vogais somem e
 * outras não —, que é o tipo de bug que passa numa revisão rápida.
 *
 * Sem caixa: `lowercase` fica fora dos normalizers porque não tem efeito nenhum.
 */
export const hiIN: LanguageProfile = {
	tag: 'hi-IN',
	direction: 'ltr',
	segmentation: 'icu-word',
	normalizers: ['nfkc', 'strip-punct'],
	diacritics: 'significant',
	caseSensitive: false,
	/**
	 * PENDÊNCIA: corte por nota não aplicado (kernel.md) — nenhuma nota do Kokoro
	 * verificada. É o catálogo de `lang_code: 'h'` do `audiotext-service`.
	 */
	tts: { voices: ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi'], speeds: [1, 0.75] },
	asr: { model: 'hi-IN', hints: [] },
	input: { modo: 'grade', teclado: devanagari },
	/**
	 * O dígito devanágari entra como variante do arábico (`१` → `1`): o NFKC não
	 * converte um no outro, e o ASR pode escrever qualquer um dos dois.
	 *
	 * **De 21 a 99 não há composto regular em híndi** — cada número é uma palavra
	 * própria e irregular (`इक्कीस`, `बाईस`, `तेईस`), não "vinte + um". Por isso
	 * `compor` devolve vazio em vez de montar formas que ninguém escreve.
	 */
	equivalences: numerais(
		[
			'शून्य|०',
			'एक|१',
			'दो|२',
			'तीन|३',
			'चार|४',
			'पाँच|पांच|५',
			'छह|६',
			'सात|७',
			'आठ|८',
			'नौ|९',
			'दस|१०',
			'ग्यारह|११',
			'बारह|१२',
			'तेरह|१३',
			'चौदह|१४',
			'पंद्रह|१५',
			'सोलह|१६',
			'सत्रह|१७',
			'अठारह|१८',
			'उन्नीस|१९'
		],
		['बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'],
		() => [],
		[['100', 'सौ']]
	)
};
