import { teclasDe, type Tecla, type Teclado } from './teclado';

/**
 * Os layouts de teclado, por SCRIPT e não por idioma — dois idiomas podem
 * dividir um (o devanágari serve híndi, marati e nepali). Quem escolhe qual
 * usar é o `LanguageProfile`.
 *
 * Nenhum deles traz espaço, apagar ou enviar: isso é chrome do componente, não
 * dado de script.
 */

/** Teclas com a pronúncia de cada uma, na mesma ordem dos caracteres. */
function comLeitura(chars: string, leituras: string[]): Tecla[] {
	return [...chars].map((char, i) => (leituras[i] ? { char, leitura: leituras[i] } : { char }));
}

/**
 * Árabe. As 28 letras na ordem do alfabeto (que é a ordem em que o aluno
 * aprende e procura), mais as formas com hamza e as duas letras finais que não
 * estão no alfabeto mas aparecem em toda frase.
 *
 * **Sem os dígitos arábico-índicos (`٠١٢...`) de propósito.** Eles pareceriam
 * naturais aqui e seriam uma armadilha: o `ar-SA` não tem grupo de equivalência
 * ligando `٥` a `5`, então o aluno que digitasse o dígito arábico levaria zero
 * num gabarito escrito com o ocidental. Os dígitos ocidentais são de uso normal
 * em árabe, então é o que a última linha oferece.
 *
 * A pronúncia sob a tecla é uma transliteração de consulta, não um padrão
 * acadêmico: serve para o aluno achar o `ش` sabendo que procura "sh".
 */
export const arabe: Teclado = {
	id: 'arabe',
	lang: 'ar',
	dir: 'rtl',
	formato: 'grade',
	grupos: [
		{
			label: 'Letras',
			// prettier-ignore
			teclas: comLeitura('ابتثجحخدذرزسشصضطظعغفقكلمنهوي', [
				'a', 'b', 't', 'th', 'j', 'ḥ', 'kh', 'd', 'dh', 'r', 'z', 's', 'sh', 'ṣ',
				'ḍ', 'ṭ', 'ẓ', 'ʿ', 'gh', 'f', 'q', 'k', 'l', 'm', 'n', 'h', 'w', 'y'
			])
		},
		{
			label: 'Formas',
			// A hamza e suas portadoras, o tá marbuta e o alif maqsura: sem elas não
			// se escreve uma frase inteira, e nenhuma está no alfabeto de 28.
			teclas: comLeitura('ءأإآؤئةى', ['ʾ', 'ʾa', 'ʾi', 'ʾā', 'ʾu', 'ʾi', 'a', 'ā'])
		},
		// A pontuação mora com os números, como no "123" de um teclado nativo. Os
		// dígitos vêm PRIMEIRO porque a aba mostra as três primeiras teclas do
		// grupo (`TecladoVirtual`) — "0 1 2" se reconhece, "، ؟ ." não.
		{ label: 'Números', teclas: teclasDe('0123456789،؟.!') }
	]
};

/**
 * Devanágari (híndi). Três grupos porque é uma abugida: a consoante carrega um
 * "a" implícito, e as outras vogais entram como MATRA — marca combinante que se
 * pendura na consoante anterior.
 *
 * As matras aparecem na tecla com `◌` (U+25CC) porque marca combinante sozinha
 * não tem base para se apoiar e sai quebrada. É a convenção do próprio Unicode
 * para exibi-las isoladas.
 *
 * Os dígitos devanágaris ENTRAM aqui, ao contrário do árabe: o `hi-IN` tem os
 * grupos de equivalência que ligam `५` a `5` (ver o profile), então eles casam
 * com o gabarito.
 */
export const devanagari: Teclado = {
	id: 'devanagari',
	lang: 'hi',
	dir: 'ltr',
	formato: 'grade',
	grupos: [
		{
			label: 'Vogais',
			teclas: comLeitura('अआइईउऊऋएऐओऔ', ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'e', 'ai', 'o', 'au'])
		},
		{
			label: 'Consoantes',
			// prettier-ignore
			teclas: comLeitura('कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह', [
				'ka', 'kha', 'ga', 'gha', 'ṅa', 'ca', 'cha', 'ja', 'jha', 'ña', 'ṭa', 'ṭha',
				'ḍa', 'ḍha', 'ṇa', 'ta', 'tha', 'da', 'dha', 'na', 'pa', 'pha', 'ba', 'bha',
				'ma', 'ya', 'ra', 'la', 'va', 'śa', 'ṣa', 'sa', 'ha'
			])
		},
		{
			label: 'Matras e sinais',
			// `label` com o círculo pontilhado; `char` é só a marca. O virama não
			// tem som próprio: ele TIRA o "a" da consoante, e é isso que a tecla diz.
			teclas: [...'ािीुूृेैोौंः्'].map((char, i) => ({
				char,
				label: `◌${char}`,
				leitura: ['ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'e', 'ai', 'o', 'au', 'ṃ', 'ḥ', 'sem a'][i]
			}))
		},
		{ label: 'Números', teclas: teclasDe('०१२३४५६७८९') }
	]
};

/** Hiragana → katakana: o bloco inteiro está a 0x60 de distância. */
function paraKatakana(c: string): string {
	const n = c.codePointAt(0) ?? 0;
	return n >= 0x3041 && n <= 0x3096 ? String.fromCodePoint(n + 0x60) : c;
}

/**
 * O mapa de uma tecla de ação do kana, nos dois sentidos e nas duas formas:
 * `゛` em `か` dá `が`, em `が` volta a `か`, e o mesmo em `カ`/`ガ`. Desfazer
 * pela própria tecla é o que o teclado japonês de verdade faz.
 */
function trocaDeKana(de: string, para: string): Record<string, string> {
	const mapa: Record<string, string> = {};
	const a = [...de];
	const b = [...para];
	a.forEach((x, i) => {
		const y = b[i]!;
		mapa[x] = y;
		mapa[y] = x;
		mapa[paraKatakana(x)] = paraKatakana(y);
		mapa[paraKatakana(y)] = paraKatakana(x);
	});
	return mapa;
}

/**
 * Kana, na ordem da tabela gojūon: uma COLUNA por consoante e uma LINHA por
 * vogal — é a ordem em que o aluno aprendeu, e as casas vazias (`yi`, `wu`) são
 * parte do desenho.
 *
 * `゛` `゜` e `小` agem sobre a letra ANTERIOR em vez de ocupar teclas próprias,
 * o que mantém 46 teclas em vez de mais de 70. O katakana é uma VARIANTE das
 * mesmas teclas, não um segundo layout: é a mesma tabela, e o aluno troca de
 * forma como troca no teclado do celular.
 *
 * **Kana e só kana.** Kanji não se digita sem conversão, e é por isso que o
 * gerador só pede para digitar em japonês quando a resposta inteira cabe aqui
 * (`language/alcance.ts`).
 */
const LINHAS_DE_KANA: [string, string[]][] = [
	['あかさたなはまやらわ', ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa']],
	['いきしちにひみ り ', ['i', 'ki', 'shi', 'chi', 'ni', 'hi', 'mi', '', 'ri', '']],
	['うくすつぬふむゆる ', ['u', 'ku', 'su', 'tsu', 'nu', 'fu', 'mu', 'yu', 'ru', '']],
	['えけせてねへめ れ ', ['e', 'ke', 'se', 'te', 'ne', 'he', 'me', '', 're', '']],
	['おこそとのほもよろを', ['o', 'ko', 'so', 'to', 'no', 'ho', 'mo', 'yo', 'ro', 'wo']]
];

const hiraganaDoTeclado = [...LINHAS_DE_KANA.map(([linha]) => linha).join(''), 'ん'].filter(
	(c) => c !== ' '
);

export const kana: Teclado = {
	id: 'kana',
	lang: 'ja',
	dir: 'ltr',
	formato: 'grade',
	dica: 'Escreva com kana — o kanji não é pedido.',
	variantes: [
		{ label: 'ひらがな' },
		{
			label: 'カタカナ',
			troca: Object.fromEntries(hiraganaDoTeclado.map((c) => [c, paraKatakana(c)]))
		}
	],
	grupos: [
		{
			label: 'Kana',
			colunas: 10,
			teclas: [
				...LINHAS_DE_KANA.flatMap(([linha, leituras]) =>
					[...linha].map((char, i): Tecla | null =>
						char === ' ' ? null : { char, leitura: leituras[i] }
					)
				),
				{
					char: '゛',
					nome: 'Sonorizar a letra anterior',
					acao: {
						tipo: 'trocar-anterior',
						mapa: trocaDeKana(
							'かきくけこさしすせそたちつてとはひふへほう',
							'がぎぐげござじずぜぞだぢづでどばびぶべぼゔ'
						)
					}
				},
				{
					char: '゜',
					nome: 'Meio-som na letra anterior',
					acao: { tipo: 'trocar-anterior', mapa: trocaDeKana('はひふへほ', 'ぱぴぷぺぽ') }
				},
				{
					char: '小',
					nome: 'Deixar a letra anterior pequena',
					acao: {
						tipo: 'trocar-anterior',
						mapa: trocaDeKana('あいうえおつやゆよわ', 'ぁぃぅぇぉっゃゅょゎ')
					}
				},
				{ char: 'ん', leitura: 'n' },
				{ char: 'ー', leitura: 'longo', nome: 'Alongar a vogal' }
			]
		}
	]
};

/** O tom de cada vogal do pinyin, na ordem a e i o u ü. */
function tom(marcadas: string): Record<string, string> {
	const mapa: Record<string, string> = {};
	[...'aeiouü'].forEach((vogal, i) => {
		const comTom = [...marcadas][i]!;
		mapa[vogal] = comTom;
		mapa[comTom] = vogal;
	});
	return mapa;
}

/**
 * Pinyin, para o mandarim. O aparelho escreve as letras, mas não o TOM — e tom
 * é fonêmico: `mā`, `má`, `mǎ` e `mà` são quatro palavras. As quatro teclas de
 * tom agem na vogal ANTERIOR, como o `゛` do kana: o aluno toca `a` e depois
 * `ˇ`, e sai `ǎ`. Tocar o mesmo tom de novo desfaz.
 *
 * É grade, e não barra de acentos ao lado do teclado do aparelho, pelo mesmo
 * motivo do kana: a resposta tem de sair TODA deste teclado para o gerador
 * saber que o aluno a alcança (`language/alcance.ts`). O hanzi ele não escreve —
 * quem torna a questão respondível é o pinyin da frase entre as respostas
 * aceitas (`language/escrita.ts`).
 *
 * QWERTY, e não em ordem alfabética: quem estuda mandarim já tem o QWERTY nos
 * dedos, e é nele que vai digitar pinyin fora daqui.
 */
export const pinyin: Teclado = {
	id: 'pinyin',
	lang: 'zh-Latn-pinyin',
	dir: 'ltr',
	formato: 'grade',
	dica: 'Pinyin com tom: toque o tom logo depois da vogal (a ˇ → ǎ).',
	grupos: [
		{
			label: 'Pinyin',
			colunas: 10,
			teclas: [
				...teclasDe('qwertyuiop'),
				...teclasDe('asdfghjklü'),
				...teclasDe('zxcvbnm'),
				null,
				null,
				null,
				{
					char: 'ˉ',
					nome: 'Primeiro tom na vogal anterior',
					acao: { tipo: 'trocar-anterior', mapa: tom('āēīōūǖ') }
				},
				{
					char: 'ˊ',
					nome: 'Segundo tom na vogal anterior',
					acao: { tipo: 'trocar-anterior', mapa: tom('áéíóúǘ') }
				},
				{
					char: 'ˇ',
					nome: 'Terceiro tom na vogal anterior',
					acao: { tipo: 'trocar-anterior', mapa: tom('ǎěǐǒǔǚ') }
				},
				{
					char: 'ˋ',
					nome: 'Quarto tom na vogal anterior',
					acao: { tipo: 'trocar-anterior', mapa: tom('àèìòùǜ') }
				}
			]
		}
	]
};

/**
 * As barras de acento das línguas latinas. Não são teclado: o aparelho do aluno
 * já escreve as letras, o que falta é o diacrítico. Uma linha ao lado do campo
 * resolve, e um teclado inteiro seria estorvo em cima do teclado do sistema.
 *
 * Cada língua leva só os SEUS: oferecer `ñ` a quem estuda francês é ruído, e
 * `ç` a quem estuda italiano também.
 *
 * Minúsculas apenas. Todos os quatro profiles têm `lowercase` nos normalizers,
 * então a caixa não conta na correção — dobrar as teclas para nada tiraria
 * espaço numa barra que precisa caber na largura de um celular.
 */
function barraDeAcentos(id: string, lang: string, chars: string): Teclado {
	return {
		id,
		lang,
		dir: 'ltr',
		formato: 'barra',
		grupos: [{ label: 'Acentos', teclas: teclasDe(chars) }]
	};
}

export const acentosFrances = barraDeAcentos('acentos-fr', 'fr', 'àâäçéèêëîïôöùûüÿœæ');
export const acentosEspanhol = barraDeAcentos('acentos-es', 'es', 'áéíóúüñ¿¡');
export const acentosItaliano = barraDeAcentos('acentos-it', 'it', 'àèéìíîòóù');
export const acentosPortugues = barraDeAcentos('acentos-pt', 'pt', 'áàâãçéêíóôõúü');
