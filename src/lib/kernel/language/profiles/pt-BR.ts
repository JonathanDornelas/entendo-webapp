import type { LanguageProfile } from '../profile';
import { acentosPortugues } from '../teclados';
import { numerais } from '../equivalences';

/**
 * Português brasileiro — idioma de origem mais comum do produto hoje.
 * Acento é significativo (regra padrão de ortografia), então `diacritics`
 * fica `significant`: "e" não é aceito como "é".
 */
export const ptBR: LanguageProfile = {
	tag: 'pt-BR',
	direction: 'ltr',
	segmentation: 'icu-word',
	normalizers: ['nfkc', 'lowercase', 'strip-punct'],
	diacritics: 'significant',
	caseSensitive: false,
	tts: { voices: ['pf_dora', 'pm_alex', 'pm_santa'], speeds: [1, 0.75] },
	asr: { model: 'pt-BR', hints: [] },
	input: { modo: 'acentos', teclado: acentosPortugues },
	equivalences: [
		...numerais(
			[
				'zero',
				'um|uma',
				'dois|duas',
				'três',
				'quatro',
				'cinco',
				'seis',
				'sete',
				'oito',
				'nove',
				'dez',
				'onze',
				'doze',
				'treze',
				'catorze|quatorze',
				'quinze',
				'dezesseis',
				'dezessete',
				'dezoito',
				'dezenove'
			],
			['vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'],
			(dezena, unidade) => [`${dezena} e ${unidade}`],
			[['100', 'cem']]
		),
		// O futuro do presente e o futuro perifrástico dizem a mesma coisa: "irá
		// trabalhar" é "vai trabalhar". O aluno que traduz com um não pode receber
		// "quase" porque o professor escreveu o outro.
		['vou', 'irei'],
		['vai', 'irá'],
		['vais', 'irás'],
		['vamos', 'iremos'],
		['vão', 'irão'],
		// "pra" é o que o ASR escreve quando se fala "para".
		['para', 'pra']
	]
};
