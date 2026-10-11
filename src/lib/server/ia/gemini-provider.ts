import { GoogleGenAI } from '@google/genai';
import { instrucoesDoSistema, mensagemDoProfessor } from './prompt';
import { FalhaDoProvedor, type GeradorDeMateriais } from './provider';

/**
 * A IA pelo Gemini (`@google/genai`), com SAÍDA ESTRUTURADA: o JSON Schema da
 * resposta (saído do mesmo Zod que valida a volta, `schemas.ts`) vai em
 * `responseJsonSchema`, e o modelo responde no formato.
 *
 * O id do modelo NÃO está no código: vem de `GEMINI_MODEL`, porque o catálogo
 * do Gemini muda de nome com frequência — quem opera escolhe o Flash estável
 * vigente em ai.google.dev/gemini-api/docs/models (docs/operacao.md).
 */
export function criarGemini(config: { apiKey: string; model: string }): GeradorDeMateriais {
	const cliente = new GoogleGenAI({ apiKey: config.apiKey });

	return {
		nome: `gemini:${config.model}`,
		async propor(pedido, { schema, timeoutMs }) {
			const abortar = new AbortController();
			const relogio = setTimeout(() => abortar.abort(), timeoutMs);
			try {
				const resposta = await cliente.models.generateContent({
					model: config.model,
					contents: mensagemDoProfessor(pedido),
					config: {
						systemInstruction: instrucoesDoSistema(pedido),
						responseMimeType: 'application/json',
						responseJsonSchema: schema,
						temperature: 0.7,
						abortSignal: abortar.signal
					}
				});
				const texto = resposta.text;
				if (!texto) throw new FalhaDoProvedor('O modelo não devolveu conteúdo.');
				try {
					return JSON.parse(texto) as unknown;
				} catch {
					throw new FalhaDoProvedor('O modelo devolveu algo que não é JSON.');
				}
			} catch (e) {
				if (e instanceof FalhaDoProvedor) throw e;
				throw new FalhaDoProvedor(
					abortar.signal.aborted
						? 'O modelo demorou demais para responder.'
						: 'O provedor de IA recusou o pedido.'
				);
			} finally {
				clearTimeout(relogio);
			}
		}
	};
}
