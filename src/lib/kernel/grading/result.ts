/**
 * `grade()` nunca lança exceção para resposta errada — ver
 * .claude/rules/kernel.md "Correção" e a skill `nova-interacao`, passo 5.
 * Falha aqui é payload malformado, não resposta incorreta.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Um pedaço da resposta do aluno, e se ele caiu no lugar certo. */
export interface AnswerMark {
	text: string;
	ok: boolean;
}

export interface Score {
	value: number; // 0 a 1
	feedback?: string;
	/**
	 * A resposta do aluno pedaço a pedaço, para a tela GRIFAR o que saiu do
	 * lugar em vez de contar posições. "8 de 9 palavras na posição certa; a
	 * primeira fora de lugar é a 5ª" obrigava o aluno a recontar a própria
	 * frase para descobrir qual era a 5ª.
	 *
	 * São as palavras que ELE escolheu — as mesmas que já estão na tela dele.
	 * O gabarito continua fora daqui (regra inviolável nº 1); o que se
	 * acrescenta é onde ele errou, e só quando o professor deixou o resultado
	 * visível.
	 */
	marks?: AnswerMark[];
	/**
	 * A resposta CERTA, pedaço a pedaço — para a tela mostrar como deveria ter
	 * ficado, logo abaixo do que o aluno montou. Marcar o erro sem dizer o
	 * certo deixa metade do retorno de fora: ele vê que a 5ª está torta e
	 * continua sem saber qual era.
	 *
	 * É gabarito, e sai do servidor pelo MESMO caminho do resto do veredito —
	 * só quando o professor deixou `showResult` ligado (`responderItem`
	 * devolve `state: 'hidden'` antes disso).
	 *
	 * Uma LISTA e não uma frase pronta: juntar os pedaços com espaço é a regra
	 * inviolável nº 5 pelo avesso, e em japonês, chinês ou tailandês sairia
	 * errado. Quem monta a linha é a tela, com os pedaços lado a lado.
	 */
	expected?: string[];
}
