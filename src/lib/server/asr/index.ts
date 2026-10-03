import type { AsrProvider } from './provider';
import { audiotextAsrProvider } from './audiotext-provider';

/**
 * Sem provedor de ASR configurado, o servidor OMITE o item de fala do
 * payload em vez de mostrar uma tela de gravação que não corrige nada — ver
 * server.md "ASR" e paginas.md "Player". Por isso os geradores recebem
 * `capabilities.asr` e simplesmente não produzem item `speak`.
 *
 * O provedor real ainda é uma pendência de produto (CLAUDE.md). Quando
 * existir, ele entra aqui e nada mais no produto muda.
 */
export function isAsrConfigured(): boolean {
	return !!process.env.ASR_PROVIDER;
}

export function getAsrProvider(): AsrProvider {
	const name = process.env.ASR_PROVIDER;
	if (name === 'audiotext') return audiotextAsrProvider;
	throw new Error(
		`ASR_PROVIDER="${name ?? ''}" não é um provedor conhecido. Use "audiotext" (o serviço de áudio).`
	);
}
