import { numerais } from '../equivalences';

/**
 * O que o inglês AMERICANO e o BRITÂNICO tratam como a mesma coisa. Os dois
 * perfis leem daqui em vez de cada um ter a sua cópia: numeral e contração não
 * mudam com o sotaque, e duas listas de sessenta linhas divergem no primeiro
 * acréscimo — alguém acrescenta "shan't" num lado e o outro passa a corrigir
 * diferente pela metade.
 *
 * O que NÃO mora aqui é a ortografia que realmente difere entre os dois
 * (`colour`/`color`, `realise`/`realize`): igualá-las seria dizer ao aluno de
 * inglês britânico que `color` está certo. Isso é decisão do professor, em
 * "Respostas aceitas" (kernel.md).
 */

/** "seven" e "7" são a mesma resposta — o ASR escreve o dígito. */
export const numeraisEmIngles = numerais(
	[
		'zero',
		'one',
		'two',
		'three',
		'four',
		'five',
		'six',
		'seven',
		'eight',
		'nine',
		'ten',
		'eleven',
		'twelve',
		'thirteen',
		'fourteen',
		'fifteen',
		'sixteen',
		'seventeen',
		'eighteen',
		'nineteen'
	],
	['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
	// "twenty-one" perde o hífen na normalização e vira "twentyone".
	(dezena, unidade) => [`${dezena} ${unidade}`, `${dezena}${unidade}`],
	[['100', 'one hundred', 'a hundred', 'hundred']]
);

/**
 * Contrações: "I'm" e "I am" são a mesma frase. As formas estão sem o apóstrofo
 * porque `strip-punct` já o tirou.
 *
 * Ficam FORA as contrações cuja forma sem apóstrofo é outra palavra — "were"
 * (we're), "well" (we'll), "ill" (I'll), "its" (it's), "id" (I'd): igualá-las
 * apagaria uma distinção real.
 */
export const contracoesEmIngles: string[][] = [
	['i am', 'im'],
	['you are', 'youre'],
	['he is', 'hes'],
	['she is', 'shes'],
	['they are', 'theyre'],
	['that is', 'thats'],
	['what is', 'whats'],
	['there is', 'theres'],
	['do not', 'dont'],
	['does not', 'doesnt'],
	['did not', 'didnt'],
	['is not', 'isnt'],
	['are not', 'arent'],
	['was not', 'wasnt'],
	['were not', 'werent'],
	['have not', 'havent'],
	['has not', 'hasnt'],
	['had not', 'hadnt'],
	['cannot', 'cant', 'can not'],
	['will not', 'wont'],
	['would not', 'wouldnt'],
	['could not', 'couldnt'],
	['should not', 'shouldnt'],
	['i have', 'ive'],
	['you have', 'youve'],
	['we have', 'weve'],
	['they have', 'theyve'],
	['you will', 'youll'],
	['they will', 'theyll'],
	['it will', 'itll']
];

/** As duas listas juntas, que é como os dois perfis as usam. */
export const equivalenciasEmIngles: string[][] = [...numeraisEmIngles, ...contracoesEmIngles];
