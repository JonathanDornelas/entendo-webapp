import type { LanguageProfile } from './profile';
import { aplicarEquivalencias } from './equivalences';

/**
 * Toda comparação de string passa por aqui — regra inviolável nº 6.
 * Normalização Unicode antes de qualquer igualdade, senão `é` composto não
 * bate com `é` pré-composto.
 */
export function normalize(
	text: string,
	profile: Pick<LanguageProfile, 'normalizers' | 'tag' | 'diacritics'> &
		Partial<Pick<LanguageProfile, 'equivalences'>>
): string {
	const stepped = profile.normalizers.reduce((value, step) => {
		switch (step) {
			case 'nfkc':
				return value.normalize('NFKC');
			// Turco tem regra própria de maiúscula/minúscula — nunca
			// `toLowerCase()` sem locale.
			case 'lowercase':
				return value.toLocaleLowerCase(profile.tag);
			case 'strip-punct':
				return value.replace(/[\p{P}\p{S}]/gu, '');
			// Onde espaço não separa palavra (japonês, chinês), ele não pode
			// custar nada. É o que deixa o pinyin ser escrito `wǒ shì xuéshēng`
			// ou `wǒshì xuéshēng` — a divisão em palavras varia de livro para
			// livro, e o segmentador escolhe uma — e a leitura em kana com ou
			// sem espaço entre as palavras.
			case 'strip-space':
				return value.replace(/\s+/gu, '');
		}
	}, text);

	// `diacritics: 'tolerant'` (kernel.md "LanguageProfile") aceita resposta
	// sem acento como igual à acentuada — comum em idiomas onde o aluno digita
	// sem teclado nativo. Decompõe e descarta os marks combinantes (categoria
	// Unicode Mn), depois recompõe o que sobrar.
	const semDiacritico =
		profile.diacritics === 'tolerant'
			? stepped
					.normalize('NFD')
					.replace(/\p{Mn}/gu, '')
					.normalize('NFC')
			: stepped;

	// Espaço a mais NUNCA é erro de idioma. Dois toques na barra, o espaço que
	// sobra depois de `strip-punct` comer uma vírgula, o espaço colado no fim
	// pelo teclado do celular: todos viravam UMA distância de edição e
	// derrubavam a resposta para "quase" — ou, numa palavra curta, para errado.
	// Vale igual em japonês e chinês, onde não há espaço nenhum para colapsar.
	const colapsado = semDiacritico.replace(/\s+/gu, ' ').trim();

	// Por último, o que a língua trata como a mesma coisa: "seven" e "7", "irá"
	// e "vai", "im" e "i am" (`LanguageProfile.equivalences`). Vem depois de
	// tudo porque as formas dos grupos estão escritas já normalizadas — e vem
	// AQUI, no funil de toda comparação, para nenhuma régua ter de lembrar de
	// aplicar.
	return aplicarEquivalencias(colapsado, { equivalences: profile.equivalences ?? [] });
}
