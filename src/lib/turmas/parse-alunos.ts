/**
 * Converte a lista COLADA de alunos em cadastros. Isomórfico de propósito: a
 * tela usa exatamente este parser para a prévia, então o número que ela mostra
 * é o número que o servidor vai gravar.
 *
 * Nada é descartado em silêncio — cada linha vira uma entrada com um estado, e
 * a tela mostra o motivo de quem fica de fora, com o número da linha
 * (paginas.md "Turmas e alunos").
 */

export type LinhaAlunoStatus = 'com-email' | 'sem-email' | 'email-invalido' | 'sem-nome';

export interface LinhaAluno {
	/** 1-based, para a tela dizer "linha 7". */
	line: number;
	raw: string;
	name: string;
	email: string | null;
	status: LinhaAlunoStatus;
}

/** Os mesmos separadores do material colado — o professor já conhece o "·". */
const SEPARADORES = ['·', '|', '\t', ';', ',', ' - '];

/**
 * Validação deliberadamente frouxa: `algo@algo.algo`. E-mail é um formato
 * hostil de validar por regex, e recusar um endereço válido é pior do que
 * aceitar um que vai voltar — a falha de entrega tem estado próprio na tela.
 */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(valor: string): boolean {
	return FORMATO_EMAIL.test(valor);
}

function separar(linha: string): [string, string] | null {
	for (const separador of SEPARADORES) {
		const i = linha.indexOf(separador);
		if (i > 0) {
			const esquerda = linha.slice(0, i).trim();
			const direita = linha.slice(i + separador.length).trim();
			if (esquerda) return [esquerda, direita];
		}
	}
	return null;
}

export function parseAlunos(bruto: string): LinhaAluno[] {
	return bruto
		.split('\n')
		.map((raw, i) => ({ raw, line: i + 1 }))
		.filter(({ raw }) => raw.trim())
		.map(({ raw, line }) => {
			const texto = raw.trim();
			const par = separar(texto);

			// Linha com um e-mail solto ainda é um aluno: o nome vira a parte
			// antes do @, que é melhor do que descartar a linha.
			if (!par) {
				if (emailValido(texto)) {
					return {
						line,
						raw,
						name: texto.split('@')[0],
						email: texto,
						status: 'com-email' as const
					};
				}
				// Só o nome NÃO é erro: aluno sem e-mail é permitido.
				return { line, raw, name: texto, email: null, status: 'sem-email' as const };
			}

			const [nome, email] = par;
			if (!nome) return { line, raw, name: '', email: null, status: 'sem-nome' as const };
			if (!email) return { line, raw, name: nome, email: null, status: 'sem-email' as const };
			return emailValido(email)
				? { line, raw, name: nome, email, status: 'com-email' as const }
				: { line, raw, name: nome, email: null, status: 'email-invalido' as const };
		});
}

/** As linhas que viram cadastro. `sem-nome` é a única que não vira. */
export function alunosValidos(linhas: LinhaAluno[]) {
	return linhas
		.filter((l) => l.status !== 'sem-nome')
		.map((l) => ({ name: l.name, email: l.email }));
}
