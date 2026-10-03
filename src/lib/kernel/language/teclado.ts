/**
 * Como o aluno DIGITA no idioma alvo.
 *
 * Isto é especificidade de idioma, então mora no `LanguageProfile` como tudo o
 * mais (CLAUDE.md: "Se você está escrevendo `if (lang === 'ja')`, está errado").
 * O componente do Player recebe o teclado resolvido e não conhece idioma nenhum.
 *
 * **Quatro modos, e a diferença entre eles é o que o aparelho do aluno já
 * resolve:**
 *
 * - `nativo` — o teclado do aparelho basta. Inglês.
 * - `acentos` — o teclado do aparelho escreve as letras, mas não os
 *   diacríticos. Uma barra de acentos ao lado do campo resolve; um teclado
 *   inteiro seria estorvo. Francês, italiano, espanhol, português.
 * - `grade` — o aparelho não escreve o script. Precisa de um teclado de
 *   verdade, e ele SUBSTITUI o do sistema. Árabe, devanágari, kana.
 * - `ime` — **não dá para resolver com teclado**, nem com transcrição. Quem lê
 *   este modo é o GERADOR, que deixa de produzir item de digitar no idioma alvo
 *   e manda "montar a frase" no lugar. Nenhum profile está nele hoje: foi o
 *   estado do japonês e do chinês até eles ganharem teclado e transcrição.
 *
 * **Japonês e chinês são `grade` com TRANSCRIÇÃO.** O teclado de kana não
 * escreve kanji e o de pinyin não escreve hanzi — medido: kana contra o
 * gabarito em kanji vale ZERO, não parcial. O que fecha a conta é o gabarito
 * ganhar a LEITURA da frase como resposta aceita (`Transcricao`,
 * `language/escrita.ts`), e o gerador conferir o ALCANCE do teclado
 * (`language/alcance.ts`): questão de digitar só nasce quando alguma resposta
 * aceita cabe no que as teclas escrevem.
 */

export type ModoDeEntrada = 'nativo' | 'acentos' | 'grade' | 'ime';

/**
 * O que uma tecla faz em vez de inserir. Hoje só existe uma: TROCAR o caractere
 * antes do cursor por outro — o `゛` do kana transforma `か` em `が`, o `小` faz
 * `つ` virar `っ`. É o que mantém o teclado de kana em 46 teclas em vez de mais
 * de 70, e é como o teclado japonês de verdade funciona.
 *
 * O mapa é DADO (serializável), não função: o teclado viaja do servidor para o
 * browser dentro do item.
 */
export interface AcaoDeTecla {
	tipo: 'trocar-anterior';
	/** De → para. Quem monta o layout o faz nos dois sentidos, para a tecla desfazer. */
	mapa: Record<string, string>;
}

export interface Tecla {
	/** O que é INSERIDO no campo — ou, numa tecla de ação, o glifo dela. */
	char: string;
	/**
	 * O que aparece na tecla, quando difere do que ela insere. Existe para as
	 * marcas combinantes do devanágari: `ा` sozinho não tem onde se apoiar e sai
	 * quebrado, então a tecla mostra `◌ा` — o círculo pontilhado é a convenção
	 * do Unicode para exibir marca sem base.
	 */
	label?: string;
	/**
	 * Só onde o glifo não se explica. A regra geral é NÃO preencher: o `lang` no
	 * botão faz o leitor de tela pronunciar o caractere na língua certa, e um
	 * nome escrito à mão ("alef") seria uma transliteração a mais para manter
	 * errada. As teclas de AÇÃO precisam dele: `゛` não diz "sonorizar".
	 */
	nome?: string;
	/**
	 * A pronúncia sob a tecla (`ka`, `sh`, `kha`). É o que deixa o aluno achar a
	 * letra antes de ter decorado o alfabeto — e a tela deixa desligar quando ele
	 * já não precisa.
	 */
	leitura?: string;
	/** Tecla que age sobre o texto em vez de inserir. */
	acao?: AcaoDeTecla;
}

export interface GrupoDeTeclas {
	/** Rótulo da seção. O aluno de árabe não procura "consoante", procura letra. */
	label: string;
	/**
	 * `null` é uma CASA VAZIA — só faz sentido com `colunas`. A tabela de kana
	 * tem buracos de verdade (não existe `yi` nem `wu`), e eles são parte do
	 * desenho: é a posição na tabela que o aluno decorou.
	 */
	teclas: (Tecla | null)[];
	/**
	 * Grade de colunas FIXAS, lida linha a linha. Sem isto as teclas fluem e
	 * quebram onde a largura mandar — o certo para o alfabeto árabe, errado para
	 * a tabela gojūon, onde a coluna É a consoante.
	 */
	colunas?: number;
}

/**
 * Uma forma alternativa das MESMAS teclas — o katakana do teclado de kana.
 * `troca` leva o caractere da forma padrão ao desta; o que não está nele fica
 * igual (o `ー` é o mesmo nos dois).
 */
export interface VarianteDoTeclado {
	label: string;
	troca?: Record<string, string>;
}

export interface Teclado {
	/** Identifica o layout, não o idioma: dois idiomas podem dividir um script. */
	id: string;
	/** A tag que vai no `lang` dos botões — é o que faz o leitor de tela acertar. */
	lang: string;
	/** A direção das teclas. Segue o script, não a interface. */
	dir: 'ltr' | 'rtl';
	/**
	 * Como as teclas se arranjam na tela, e o que o teclado faz com o do sistema.
	 *
	 * - `barra` — uma linha só, ao lado do campo, e o teclado do APARELHO
	 *   continua aberto: ele escreve as letras, a barra só completa os acentos.
	 * - `grade` — o teclado inteiro, e ele SUBSTITUI o do aparelho (que não
	 *   escreve este script). Traz espaço e apagar, que a barra não precisa.
	 *
	 * Mora no layout e não é derivado do profile para o componente do Player não
	 * precisar conhecer `LanguageProfile` nenhum — ele recebe o teclado e desenha.
	 */
	formato: 'barra' | 'grade';
	grupos: GrupoDeTeclas[];
	/** A primeira é a padrão. Ausente = uma forma só. */
	variantes?: VarianteDoTeclado[];
	/**
	 * Uma linha sobre COMO responder, quando o teclado sozinho não diz — no
	 * pinyin, que o tom se toca logo depois da vogal. Vai no teclado, onde o
	 * aluno está olhando quando precisa dela.
	 */
	dica?: string;
}

/**
 * Como escrever, com o teclado, uma resposta que ele não alcança — a LEITURA da
 * frase. `明日友達に会います` não se escreve com kana; `あしたともだちにあいます`
 * sim. `我们还没决定` não se escreve com letras; `wǒmen hái méi juédìng` sim.
 *
 * O profile só DECLARA qual transcrição vale para o idioma. Quem transcreve é o
 * servidor (`$lib/server/escrita`), com dicionário — o kernel é puro e não
 * carrega 18 MB de japonês. Ver `language/escrita.ts`.
 */
export type Transcricao = 'kana' | 'pinyin';

/**
 * O que o profile declara. `grade` e `acentos` carregam o layout; `nativo` e
 * `ime` não têm teclado nenhum — no primeiro porque não precisa, no segundo
 * porque teclado não resolve.
 */
export type EntradaDoIdioma =
	| { modo: 'nativo' }
	| { modo: 'ime' }
	| { modo: 'acentos'; teclado: Teclado }
	| { modo: 'grade'; teclado: Teclado; transcricao?: Transcricao };

/** Atalho de leitura: este idioma precisa de IME para ser digitado? */
export function exigeIme(entrada: EntradaDoIdioma): boolean {
	return entrada.modo === 'ime';
}

/** O teclado a mostrar, ou nulo quando não há o que mostrar. */
export function tecladoDe(entrada: EntradaDoIdioma): Teclado | null {
	return entrada.modo === 'acentos' || entrada.modo === 'grade' ? entrada.teclado : null;
}

/** Monta as teclas a partir de uma string de caracteres — um por tecla. */
export function teclasDe(chars: string): Tecla[] {
	return [...chars].map((char) => ({ char }));
}

/** As teclas de verdade de um grupo, sem as casas vazias. */
export function teclasDoGrupo(grupo: GrupoDeTeclas): Tecla[] {
	return grupo.teclas.filter((t): t is Tecla => t !== null);
}

/**
 * Todo caractere que o teclado consegue PRODUZIR: as teclas que inserem, na
 * forma padrão e em cada variante, mais o que as teclas de ação alcançam
 * trocando o anterior. É a pergunta que o gerador faz antes de pedir para o
 * aluno digitar uma resposta (`language/alcance.ts`).
 */
export function alcanceDoTeclado(teclado: Teclado): Set<string> {
	const alcance = new Set<string>();
	const trocas = (teclado.variantes ?? []).map((v) => v.troca ?? {});
	const acrescentar = (c: string) => {
		alcance.add(c);
		for (const troca of trocas) alcance.add(troca[c] ?? c);
	};
	for (const grupo of teclado.grupos) {
		for (const tecla of teclasDoGrupo(grupo)) {
			if (tecla.acao) {
				for (const [de, para] of Object.entries(tecla.acao.mapa)) {
					acrescentar(de);
					acrescentar(para);
				}
			} else acrescentar(tecla.char);
		}
	}
	return alcance;
}
