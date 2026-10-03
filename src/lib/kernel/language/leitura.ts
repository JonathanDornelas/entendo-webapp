import { teclasDoGrupo, type Teclado } from './teclado';

/**
 * A LEITURA do que o aluno digitou, em letras latinas — a linha "Leitura" sob o
 * campo quando o teclado virtual está com a pronúncia ligada. Serve para ele
 * conferir que tocou o que quis: `おはよう` → `ohayou`.
 *
 * Não é correção nem gabarito: roda no browser, sobre o texto DELE.
 *
 * **Não é caractere a caractere em todo script**, e é por isso que existe um
 * módulo. No kana, `っ` dobra a consoante seguinte e `きゃ` é `kya`, não
 * `kiya`; no devanágari a consoante carrega um "a" que a matra substitui e o
 * virama apaga. Cada regra dessas é do SCRIPT, e mora aqui ao lado do layout —
 * a tela só pergunta.
 */
export function leituraDoTexto(teclado: Teclado, texto: string): string {
	const leitor = LEITORES[teclado.id];
	return leitor ? leitor(teclado)(texto) : caractereACaractere(teclado, texto);
}

type Leitor = (texto: string) => string;

/** O padrão: cada caractere vira a pronúncia da tecla que o produz. */
function caractereACaractere(teclado: Teclado, texto: string): string {
	const mapa = mapaDeLeitura(teclado);
	return [...texto].map((c) => mapa.get(c) ?? c).join('');
}

function mapaDeLeitura(teclado: Teclado): Map<string, string> {
	const mapa = new Map<string, string>();
	for (const grupo of teclado.grupos) {
		for (const t of teclasDoGrupo(grupo)) if (t.leitura && !t.acao) mapa.set(t.char, t.leitura);
	}
	return mapa;
}

// ── kana ────────────────────────────────────────────────────────────────────

// prettier-ignore
const ROMAJI: Record<string, string> = {
	あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
	か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
	さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
	た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
	な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
	は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
	ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
	や: 'ya', ゆ: 'yu', よ: 'yo',
	ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
	わ: 'wa', を: 'wo', ん: 'n',
	が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
	ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
	だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
	ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
	ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
	ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
	ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa', ゔ: 'vu'
};

/** Katakana → hiragana: a leitura é a mesma, e a tabela fica uma só. */
function paraHiragana(c: string): string {
	const n = c.codePointAt(0) ?? 0;
	return n >= 0x30a1 && n <= 0x30f6 ? String.fromCodePoint(n - 0x60) : c;
}

function lerKana(texto: string): string {
	const letras = [...texto].map(paraHiragana);
	let saida = '';
	for (let i = 0; i < letras.length; i++) {
		const c = letras[i]!;
		const proxima = letras[i + 1];

		// `っ` pequeno dobra a consoante da sílaba seguinte: きって → kitte.
		if (c === 'っ') {
			const seguinte = proxima ? ROMAJI[proxima] : undefined;
			saida += seguinte ? seguinte[0] : '';
			continue;
		}

		// Sílaba contraída: consoante com "i" + ゃゅょ pequeno. きゃ → kya, しゃ → sha.
		const base = ROMAJI[c];
		if (base?.endsWith('i') && (proxima === 'ゃ' || proxima === 'ゅ' || proxima === 'ょ')) {
			const raiz = base.slice(0, -1);
			const semY = raiz === 'sh' || raiz === 'ch' || raiz === 'j';
			saida += (semY ? raiz : `${raiz}y`) + ROMAJI[proxima]!.slice(1);
			i++;
			continue;
		}

		// A barra de alongamento repete a vogal anterior: コーヒー → koohii.
		if (c === 'ー') {
			const vogal = saida.match(/[aeiou]$/)?.[0];
			saida += vogal ?? '-';
			continue;
		}

		saida += base ?? c;
	}
	return saida;
}

// ── devanágari ──────────────────────────────────────────────────────────────

const VIRAMA = '्';

/** Consoante (sem o "a") e matra, da pronúncia das teclas do próprio layout. */
function lerDevanagari(teclado: Teclado): Leitor {
	const consoantes = new Map<string, string>();
	const matras = new Map<string, string>();
	const outros = new Map<string, string>();
	for (const grupo of teclado.grupos) {
		for (const t of teclasDoGrupo(grupo)) {
			if (!t.leitura) continue;
			if (/\p{M}/u.test(t.char)) matras.set(t.char, t.leitura);
			else if (grupo.label === 'Consoantes') consoantes.set(t.char, t.leitura.replace(/a$/, ''));
			else outros.set(t.char, t.leitura);
		}
	}

	return (texto) => {
		const letras = [...texto];
		let saida = '';
		for (let i = 0; i < letras.length; i++) {
			const c = letras[i]!;
			const consoante = consoantes.get(c);
			if (consoante === undefined) {
				// Anusvara e visarga seguem a vogal; o virama já foi tratado.
				if (c === VIRAMA) continue;
				saida += matras.get(c) ?? outros.get(c) ?? c;
				continue;
			}
			// A consoante carrega um "a" — a menos que a matra o troque ou o
			// virama o apague: क = ka, कि = ki, क् = k.
			const proxima = letras[i + 1];
			saida += consoante;
			if (proxima === VIRAMA) continue;
			if (proxima && matras.has(proxima) && !/[ṃḥ]/u.test(matras.get(proxima)!)) {
				saida += matras.get(proxima);
				i++;
				continue;
			}
			saida += 'a';
		}
		return saida;
	};
}

// O devanágari lê a pronúncia das próprias teclas, então o leitor é montado
// uma vez por layout.
const cacheDevanagari = new WeakMap<Teclado, Leitor>();

const LEITORES: Record<string, (teclado: Teclado) => Leitor> = {
	kana: () => lerKana,
	devanagari: (teclado) => {
		const pronto = cacheDevanagari.get(teclado);
		if (pronto) return pronto;
		const novo = lerDevanagari(teclado);
		cacheDevanagari.set(teclado, novo);
		return novo;
	}
};
