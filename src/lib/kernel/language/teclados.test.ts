import { describe, expect, it } from 'vitest';
import { languageProfiles } from './profiles';
import { normalize } from './normalize';
import { tecladoAlcanca } from './alcance';
import { kana } from './teclados';
import { tecladoDe, teclasDoGrupo, type Teclado } from './teclado';
import type { LanguageProfile } from './profile';

/**
 * Os teclados virtuais, contra o profile que os usa. A pergunta que importa não
 * é "o layout está bonito", é **"o que o teclado oferece chega à correção?"** —
 * uma tecla que o normalizador descarta é uma tecla que o aluno toca à toa, e
 * uma que não casa com o gabarito é uma armadilha.
 */

const comTeclado = Object.values(languageProfiles)
	.map((profile) => ({ profile, teclado: tecladoDe(profile.input) }))
	.filter((x): x is { profile: LanguageProfile; teclado: Teclado } => x.teclado !== null);

const casos = comTeclado.map(({ profile, teclado }) => [profile.tag, profile, teclado] as const);

/** Pontuação e símbolo o `strip-punct` descarta de propósito — não é letra. */
const ehPontuacao = (c: string) => /^[\p{P}\p{S}]$/u.test(c);

/**
 * Tudo que o teclado ESCREVE: as teclas que inserem, em cada variante, mais o
 * que as teclas de ação produzem. É isso que precisa chegar à correção — a
 * tecla `゛` em si nunca entra no campo, mas o `が` que ela faz entra.
 */
function escritos(teclado: Teclado): string[] {
	const trocas = (teclado.variantes ?? []).map((v) => v.troca ?? {});
	const saida = new Set<string>();
	for (const t of teclado.grupos.flatMap(teclasDoGrupo)) {
		const base = t.acao ? Object.values(t.acao.mapa) : [t.char];
		for (const c of base) {
			saida.add(c);
			for (const troca of trocas) saida.add(troca[c] ?? c);
		}
	}
	return [...saida];
}

describe('quem tem teclado', () => {
	it('árabe, híndi, japonês e chinês têm grade; as quatro latinas acentuadas têm barra', () => {
		const porFormato = Object.fromEntries(
			comTeclado.map(({ profile, teclado }) => [profile.tag, teclado.formato])
		);
		expect(porFormato).toEqual({
			'pt-BR': 'barra',
			'es-ES': 'barra',
			'fr-FR': 'barra',
			'it-IT': 'barra',
			'hi-IN': 'grade',
			'ar-SA': 'grade',
			'ja-JP': 'grade',
			'zh-CN': 'grade'
		});
	});

	// Inglês não precisa: o teclado do aparelho já escreve tudo.
	it('só o inglês não tem teclado', () => {
		const sem = Object.values(languageProfiles)
			.filter((p) => tecladoDe(p.input) === null)
			.map((p) => p.tag)
			.sort();
		expect(sem).toEqual(['en-GB', 'en-US']);
	});
});

describe.each(casos)('teclado de %s', (_tag, profile, teclado) => {
	const teclas = teclado.grupos.flatMap(teclasDoGrupo);

	it('o modo do profile e o formato do layout concordam', () => {
		const esperado = profile.input.modo === 'grade' ? 'grade' : 'barra';
		expect(teclado.formato).toBe(esperado);
	});

	// A barra fica sob o campo e o teclado do aparelho segue aberto: uma linha só.
	it.runIf(teclado.formato === 'barra')('a barra é um grupo só', () => {
		expect(teclado.grupos).toHaveLength(1);
	});

	it('as teclas correm na direção do script', () => {
		expect(teclado.dir).toBe(profile.direction);
	});

	// Compara o IDIOMA, não a tag inteira: o pinyin é `zh-Latn-pinyin` — chinês,
	// escrito em letras latinas —, e o `lang` certo é esse.
	it('o lang das teclas é do mesmo idioma do profile', () => {
		expect(new Intl.Locale(teclado.lang).language).toBe(new Intl.Locale(profile.tag).language);
	});

	it('toda tecla insere exatamente um ponto de código', () => {
		const ruins = teclas.filter((t) => [...t.char].length !== 1).map((t) => t.char);
		expect(ruins).toEqual([]);
	});

	it('nenhuma tecla aparece duas vezes', () => {
		const chars = teclas.map((t) => t.char);
		expect(chars).toHaveLength(new Set(chars).size);
	});

	// A pergunta que decide se o teclado serve: a letra escrita sobrevive ao
	// normalizador DESTE idioma? Se sumisse, o aluno a digitaria à toa.
	it('toda letra que ele escreve chega à correção', () => {
		const descartadas = escritos(teclado)
			.filter((c) => !ehPontuacao(c))
			.filter((c) => normalize(c, profile) === '');
		expect(descartadas).toEqual([]);
	});

	// Onde a marca FAZ a letra (`significant`), a tecla tem de chegar à correção
	// igual a ela mesma — senão o `ç` da barra viraria `c`, e o `が` do kana
	// viraria `か`. Nos perfis `tolerant` perder a marca é justamente o combinado
	// (ver o árabe abaixo), então a regra lá é só a de cima: não pode sumir.
	it.runIf(profile.diacritics === 'significant')('nenhuma letra vira outra na correção', () => {
		const trocadas = escritos(teclado)
			.filter((c) => !ehPontuacao(c) && !/^\p{N}$/u.test(c))
			.filter((c) => normalize(c, profile) !== c.normalize('NFC').toLocaleLowerCase(profile.tag))
			.map((c) => `${c} → ${normalize(c, profile)}`);
		expect(trocadas).toEqual([]);
	});

	// Tecla de ação desfaz o que fez: `゛` em `が` volta a `か`.
	it('toda tecla de ação desfaz a si mesma', () => {
		const quebradas = teclas
			.filter((t) => t.acao)
			.flatMap((t) =>
				Object.entries(t.acao!.mapa)
					.filter(([de, para]) => t.acao!.mapa[para] !== de)
					.map(([de, para]) => `${t.char}: ${de} → ${para}`)
			);
		expect(quebradas).toEqual([]);
	});

	it('toda tecla de ação tem nome — o glifo sozinho não diz o que ela faz', () => {
		expect(teclas.filter((t) => t.acao && !t.nome).map((t) => t.char)).toEqual([]);
	});
});

describe('kana', () => {
	const profile = languageProfiles['ja-JP']!;
	const grupo = kana.grupos[0]!;
	const acao = (char: string) => teclasDoGrupo(grupo).find((t) => t.char === char)!.acao!.mapa;

	// A coluna É a consoante e a linha é a vogal: é a tabela que o aluno decorou.
	it('segue a tabela gojūon, uma coluna por consoante', () => {
		const coluna = (i: number) =>
			[0, 1, 2, 3, 4].map((linha) => grupo.teclas[linha * 10 + i]?.char ?? '·').join('');
		expect(grupo.colunas).toBe(10);
		expect([coluna(0), coluna(1), coluna(7), coluna(9)]).toEqual([
			'あいうえお',
			'かきくけこ',
			'や·ゆ·よ',
			'わ···を'
		]);
	});

	it('゛ sonoriza, ゜ dá o meio-som e 小 diminui — nas duas formas', () => {
		expect([
			acao('゛')['か'],
			acao('゛')['カ'],
			acao('゜')['は'],
			acao('小')['つ'],
			acao('小')['ヨ']
		]).toEqual(['が', 'ガ', 'ぱ', 'っ', 'ョ']);
	});

	it('o katakana é a mesma tecla na outra forma', () => {
		const katakana = kana.variantes?.[1]?.troca ?? {};
		expect([katakana['あ'], katakana['ん'], katakana['を'], katakana['ー']]).toEqual([
			'ア',
			'ン',
			'ヲ',
			undefined
		]);
	});

	// O que decide se o gerador pede para digitar: a resposta cabe no teclado?
	it('alcança frase em kana e não alcança kanji', () => {
		expect(
			['おはよう', 'がっこう', 'コーヒー', 'きょうは、いい てんき。', '私は学生です', '本'].map(
				(f) => tecladoAlcanca(kana, f, profile)
			)
		).toEqual([true, true, true, true, false, false]);
	});
});

describe('devanágari', () => {
	const hindi = tecladoDe(languageProfiles['hi-IN']!.input)!;
	const matras = hindi.grupos.find((g) => g.label.startsWith('Matras'))!;

	// Marca combinante sozinha não tem base e sai quebrada na tecla; o círculo
	// pontilhado é a convenção do Unicode para mostrá-la.
	it('toda matra aparece com o círculo pontilhado, e insere só a marca', () => {
		const semCirculo = teclasDoGrupo(matras).filter(
			(t) => t.label !== `◌${t.char}` || /\p{L}/u.test(t.char)
		);
		expect(semCirculo).toEqual([]);
	});

	// Os dígitos devanágaris só estão no teclado porque o profile os liga aos
	// ocidentais — sem isso seriam armadilha, como seriam no árabe.
	it('o dígito devanágari do teclado casa com o ocidental na correção', () => {
		const profile = languageProfiles['hi-IN']!;
		expect(normalize('५', profile)).toBe(normalize('5', profile));
	});

	it('toda letra e matra tem pronúncia', () => {
		const semLeitura = hindi.grupos
			.filter((g) => g.label !== 'Números')
			.flatMap(teclasDoGrupo)
			.filter((t) => !t.leitura)
			.map((t) => t.char);
		expect(semLeitura).toEqual([]);
	});
});

describe('árabe', () => {
	const profile = languageProfiles['ar-SA']!;
	const teclado = tecladoDe(profile.input)!;
	const teclas = teclado.grupos.flatMap(teclasDoGrupo).map((t) => t.char);

	it('tem as 28 letras do alfabeto', () => {
		const alfabeto = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'];
		expect(alfabeto.filter((l) => !teclas.includes(l))).toEqual([]);
	});

	// O dígito arábico-índico pareceria natural aqui e seria uma armadilha: o
	// `ar-SA` não o liga ao ocidental, então `٥` não casaria com um gabarito `5`.
	it('não oferece dígito arábico-índico, que não casaria com o gabarito', () => {
		expect(teclas.filter((c) => /[٠-٩]/.test(c))).toEqual([]);
		expect(normalize('٥', profile)).not.toBe(normalize('5', profile));
		expect(tecladoAlcanca(teclado, 'عندي ٥ كتب', profile)).toBe(false);
	});

	/**
	 * As letras com hamza (`أ إ آ ؤ ئ`) chegam à correção como a letra-base: na
	 * decomposição a hamza é marca combinante, e o `ar-SA` é `tolerant`. **É o
	 * comportamento certo, não um descuido**: é a normalização padrão do árabe
	 * (a de todo buscador da língua), porque a hamza sobre o alif é omitida
	 * rotineiramente na escrita corrente. O aluno que escreve `انا` por `أنا` não
	 * errou nada.
	 *
	 * As teclas ficam assim mesmo: são a grafia correta, e quem a conhece tem de
	 * conseguir escrevê-la — só não é exigida. Este teste existe para quem um dia
	 * passar o árabe para `significant` saber exatamente o que muda: estas cinco
	 * passam a ser obrigatórias.
	 */
	it('a hamza não é exigida: as letras com ela casam com a letra-base', () => {
		expect(
			[
				['أنا', 'انا'],
				['إلى', 'الى'],
				['آخر', 'اخر'],
				['سؤال', 'سوال'],
				['رئيس', 'رييس']
			].map(([com, sem]) => normalize(com!, profile) === normalize(sem!, profile))
		).toEqual([true, true, true, true, true]);
	});

	// A hamza SOZINHA é letra-base, não marca: essa sobrevive.
	it('a hamza isolada continua sendo letra', () => {
		expect(normalize('ء', profile)).toBe('ء');
	});

	// O tashkeel não tem tecla, e não precisa: a correção o descarta.
	it('alcança frase com tashkeel, que a correção descarta', () => {
		expect(tecladoAlcanca(teclado, 'أَنَا طَالِبٌ', profile)).toBe(true);
	});
});

describe('pinyin', () => {
	const profile = languageProfiles['zh-CN']!;
	const teclado = tecladoDe(profile.input)!;
	const tom = (char: string) =>
		teclado.grupos.flatMap(teclasDoGrupo).find((t) => t.char === char)!.acao!.mapa;

	it('os quatro tons agem na vogal anterior', () => {
		expect([tom('ˉ')['a'], tom('ˊ')['e'], tom('ˇ')['ü'], tom('ˋ')['o']]).toEqual([
			'ā',
			'é',
			'ǚ',
			'ò'
		]);
	});

	// O que decide se a questão de digitar existe: a resposta cabe no teclado?
	it('alcança pinyin com tom e não alcança hanzi', () => {
		expect(
			['wǒmen hái méi juédìng', 'nǚ péngyou', '我们还没决定'].map((f) =>
				tecladoAlcanca(teclado, f, profile)
			)
		).toEqual([true, true, false]);
	});

	// Tom é fonêmico: `mā` e `mà` não podem virar a mesma resposta.
	it('o tom chega à correção', () => {
		expect(normalize('mā', profile)).not.toBe(normalize('mà', profile));
	});
});
