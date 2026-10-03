/**
 * Provedor de TTS ainda indefinido — ver "Pendências" no CLAUDE.md. Gerado na
 * publicação, nunca em runtime; chave do objeto é hash(texto, voz,
 * velocidade), sempre duas velocidades (normal e reduzida). Ver
 * .claude/rules/server.md "TTS".
 */
export interface TtsProvider {
	synthesize(
		text: string,
		voice: string,
		speed: number
	): Promise<{ audio: Uint8Array; contentType: string }>;
}
