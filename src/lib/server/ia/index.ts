import { env } from '$env/dynamic/private';
import { criarGemini } from './gemini-provider';
import type { GeradorDeMateriais } from './provider';

/**
 * Qual provedor de IA está ligado. `LLM_PROVIDER` vazio = IA DESLIGADA, como
 * `TTS_PROVIDER` vazio é "sem escuta": o botão "Gerar" fica travado com o
 * motivo escrito, em vez de cobrar crédito por uma geração que não vai existir.
 */
let cache: { chave: string; gerador: GeradorDeMateriais } | null = null;

export function getGerador(): GeradorDeMateriais | null {
	const nome = env.LLM_PROVIDER;
	if (!nome) return null;
	if (nome !== 'gemini') {
		throw new Error(`LLM_PROVIDER="${nome}" não tem implementação. Use "gemini" ou deixe vazio.`);
	}
	const apiKey = env.GEMINI_API_KEY;
	const model = env.GEMINI_MODEL;
	if (!apiKey || !model) {
		throw new Error('LLM_PROVIDER="gemini" exige GEMINI_API_KEY e GEMINI_MODEL.');
	}
	const chave = `${model}:${apiKey.slice(-6)}`;
	if (cache?.chave !== chave) cache = { chave, gerador: criarGemini({ apiKey, model }) };
	return cache.gerador;
}

export function isIaConfigurada(): boolean {
	return !!env.LLM_PROVIDER;
}
