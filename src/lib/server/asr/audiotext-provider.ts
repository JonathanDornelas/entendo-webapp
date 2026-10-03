import type { AsrProvider } from './provider';
import { transcrever } from '$lib/server/audiotext/client';

/**
 * ASR pelo `audiotext-service` (Whisper large-v3).
 *
 * O `AsrProvider` do produto recebe só `(audio, hints)`; o idioma vai por um
 * segundo provedor abaixo, que é o que o Player usa. Informar o idioma importa:
 * a detecção automática do Whisper erra em áudio curto, e um "olá" de um
 * segundo vira espanhol com frequência.
 */
export const audiotextAsrProvider: AsrProvider = {
	async transcribe(audio, hints) {
		return transcrever(audio, { hints });
	}
};

/** A mesma coisa, mas dizendo em que idioma o aluno deveria estar falando. */
export function transcreverNoIdioma(
	audio: Uint8Array,
	language: string,
	hints: string[],
	contentType?: string
) {
	return transcrever(audio, { language, hints, contentType });
}
