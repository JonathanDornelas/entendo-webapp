import { createRequire } from 'node:module';
import path from 'node:path';
import kuromoji from 'kuromoji';
import { pinyin } from 'pinyin-pro';
import type { TrechoDaFrase, Transcritor } from '$lib/kernel/language/escrita';
import type { LanguageProfile } from '$lib/kernel/language/profile';
import { segmentosDePalavra } from '$lib/kernel/language/tokenize';

/**
 * Quem escreve a LEITURA de uma frase — o lado de servidor de
 * `kernel/language/escrita.ts`. O kernel diz quando pedir; aqui mora o
 * dicionário, que não cabe no kernel (é I/O, e são 18 MB de japonês) e jamais
 * vai para o browser do aluno.
 *
 * Qual transcrição usar vem do PROFILE (`input.transcricao`), nunca de uma
 * pergunta sobre o idioma: este módulo não sabe que `ja-JP` existe.
 *
 * - `kana` — kuromoji (Apache-2.0), o analisador morfológico com o IPADIC.
 *   Lê pela FRASE: `会` sozinho é `kai`, em `会います` é `a`.
 * - `pinyin` — pinyin-pro (MIT), com tom e com as regras de sandhi de `一` e
 *   `不`. As sílabas se juntam por PALAVRA, na fronteira do `Intl.Segmenter`
 *   (`wǒmen hái méi juédìng`), e a forma sílaba a sílaba também é aceita.
 *
 * Não saber ler é resposta legítima: devolve vazio, e a questão fica sem
 * leitura — o gerador a corta, a correção a corrige como sempre. Leitura
 * inventada seria pior: reprovaria quem acertou.
 */

/**
 * O transcritor que este idioma declara, ou nenhum. Carrega o dicionário na
 * PRIMEIRA vez que um idioma precisa dele (≈ 0,2 s) e o guarda: gerar uma
 * atividade de inglês não paga o japonês.
 */
export async function transcritorPara(profile: LanguageProfile): Promise<Transcritor | undefined> {
	if (profile.input.modo !== 'grade' || !profile.input.transcricao) return undefined;
	const analisador = profile.input.transcricao === 'kana' ? await analisadorJapones() : null;
	return (trecho, transcricao) => {
		if (transcricao === 'kana') return analisador ? lerKana(analisador, trecho) : [];
		return lerPinyin(trecho, profile);
	};
}

// ── kana ────────────────────────────────────────────────────────────────────

type Analisador = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
let carregando: Promise<Analisador | null> | null = null;

/**
 * O analisador, uma vez por processo. Falhar em carregar NÃO derruba a geração
 * nem a correção: sem ele, a questão só não ganha leitura — o que era o
 * comportamento de antes.
 */
function analisadorJapones(): Promise<Analisador | null> {
	carregando ??= new Promise<Analisador | null>((resolve) => {
		const require = createRequire(import.meta.url);
		const dicPath = path.join(path.dirname(require.resolve('kuromoji/package.json')), 'dict');
		kuromoji.builder({ dicPath }).build((erro, analisador) => {
			if (erro) {
				console.error('[escrita] o dicionário de japonês não carregou:', erro);
				carregando = null;
				resolve(null);
			} else resolve(analisador);
		});
	});
	return carregando;
}

const SO_KANA = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・]+$/u;
const SEM_LETRA = /^[\p{P}\p{S}\p{Z}\s]+$/u;

/** Katakana → hiragana: o kuromoji devolve a leitura em katakana. */
function paraHiragana(texto: string): string {
	return [...texto]
		.map((c) => {
			const n = c.codePointAt(0) ?? 0;
			return n >= 0x30a1 && n <= 0x30f6 ? String.fromCodePoint(n - 0x60) : c;
		})
		.join('');
}

function lerKana(analisador: Analisador, trecho: TrechoDaFrase): string[] {
	const frase = trecho.antes + trecho.alvo + trecho.depois;
	const inicio = trecho.antes.length;
	const fim = inicio + trecho.alvo.length;

	let pos = 0;
	let leitura = '';
	for (const token of analisador.tokenize(frase)) {
		const superficie = token.surface_form;
		const a = frase.indexOf(superficie, pos);
		if (a < 0) return [];
		const b = a + superficie.length;
		pos = b;
		if (b <= inicio || a >= fim) continue;
		// A lacuna corta a palavra ao meio (`会` de `会い`): não há como ler só
		// metade dela sem inventar.
		if (a < inicio || b > fim) return [];

		// Palavra já em kana fica como está — `コーヒー` não vira `こーひー`, e
		// a partícula `は` não vira `わ`: o aluno escreve o que está escrito.
		if (SO_KANA.test(superficie) || SEM_LETRA.test(superficie)) leitura += superficie;
		else if (token.reading && token.reading !== '*') leitura += paraHiragana(token.reading);
		else return [];
	}
	return leitura.trim() ? [leitura] : [];
}

// ── pinyin ──────────────────────────────────────────────────────────────────

const HAN = /\p{Script=Han}/u;

function lerPinyin(trecho: TrechoDaFrase, profile: LanguageProfile): string[] {
	const frase = trecho.antes + trecho.alvo + trecho.depois;
	const inicio = trecho.antes.length;
	const fim = inicio + trecho.alvo.length;

	// Uma sílaba por caractere, lida na FRASE inteira: o tom de `一` e `不` e a
	// leitura de polifônicos (`行`: háng em 银行, xíng em 行走) dependem dos vizinhos.
	const caracteres = [...frase];
	const silabas = pinyin(frase, { type: 'array' });
	if (silabas.length !== caracteres.length) return [];
	const silabaEm = new Map<number, string>();
	let offset = 0;
	caracteres.forEach((c, i) => {
		silabaEm.set(offset, HAN.test(c) ? silabas[i]! : c);
		offset += c.length;
	});

	const palavras: string[][] = [];
	for (const s of segmentosDePalavra(frase, profile)) {
		const a = s.inicio;
		const b = a + s.texto.length;
		if (b <= inicio || a >= fim) continue;
		if (a < inicio || b > fim) return [];
		if (!s.palavra) continue;

		const daPalavra: string[] = [];
		for (let o = a; o < b;) {
			const c = String.fromCodePoint(frase.codePointAt(o)!);
			daPalavra.push(silabaEm.get(o) ?? c);
			o += c.length;
		}
		palavras.push(daPalavra);
	}
	if (palavras.length === 0) return [];

	const porPalavra = palavras.map((p) => p.join('')).join(' ');
	const porSilaba = palavras.flat().join(' ');
	return porPalavra === porSilaba ? [porPalavra] : [porPalavra, porSilaba];
}
