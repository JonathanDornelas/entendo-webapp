/**
 * CSV para os botões "CSV" dos resultados. Montado no NAVEGADOR, com os dados
 * que a tela já mostra: exportar não lê nada a mais do que o professor vê, e
 * não precisa de endpoint.
 *
 * Separador `;` e BOM no começo: é o que o Excel em português abre com acento e
 * coluna certos sem pedir importação. Toda célula vai entre aspas, e aspas
 * internas viram duas — nome de aluno e título de atividade são texto livre.
 */

/** O BOM do UTF-8: é por ele que o Excel lê os acentos certos. Escrito por código, não como caractere invisível no arquivo. */
const BOM = String.fromCharCode(0xfeff);

export type Celula = string | number | null | undefined;

function celula(v: Celula): string {
	const texto = v === null || v === undefined ? '' : String(v);
	return `"${texto.replace(/"/g, '""')}"`;
}

export function montarCsv(cabecalho: string[], linhas: Celula[][]): string {
	return BOM + [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n');
}

/** Baixa o CSV com o nome dado. Só no navegador. */
export function baixarCsv(nome: string, conteudo: string): void {
	const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
	const a = document.createElement('a');
	a.href = url;
	a.download = nome.endsWith('.csv') ? nome : `${nome}.csv`;
	document.body.append(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/** "Present perfect — turma B" → "present-perfect-turma-b", para o nome do arquivo. */
export function nomeDeArquivo(titulo: string): string {
	return (
		titulo
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.toLowerCase()
			.replace(/[^\p{L}\p{N}]+/gu, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'resultados'
	);
}
