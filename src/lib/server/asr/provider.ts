/**
 * Provedor de ASR ainda indefinido — ver "Pendências" no CLAUDE.md. Nunca Web
 * Speech API do browser: suporte irregular fora do Chrome e qualidade ruim.
 * Ver .claude/rules/server.md "ASR".
 */
export interface AsrProvider {
	transcribe(audio: Uint8Array, hints: string[]): Promise<{ text: string }>;
}
