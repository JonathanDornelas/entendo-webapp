import type { TtsProvider } from './provider';

/**
 * Provedor de TTS de MENTIRA, para exercitar o pipeline sem credencial de um
 * provedor real (que ainda é uma pendência de produto — ver CLAUDE.md).
 * Gera um WAV silencioso com a duração proporcional ao texto: o suficiente
 * para a fila, o storage e a espera da publicação funcionarem de verdade.
 *
 * Só entra quando `TTS_PROVIDER=stub`. **Não use em produção** — o aluno
 * ouviria silêncio.
 */

const SAMPLE_RATE = 8000;

function silentWav(seconds: number): Uint8Array {
	const samples = Math.max(1, Math.round(SAMPLE_RATE * seconds));
	const buffer = new ArrayBuffer(44 + samples * 2);
	const view = new DataView(buffer);

	const ascii = (offset: number, text: string) => {
		for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
	};

	ascii(0, 'RIFF');
	view.setUint32(4, 36 + samples * 2, true);
	ascii(8, 'WAVE');
	ascii(12, 'fmt ');
	view.setUint32(16, 16, true); // tamanho do bloco fmt
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, SAMPLE_RATE, true);
	view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
	view.setUint16(32, 2, true); // block align
	view.setUint16(34, 16, true); // bits por amostra
	ascii(36, 'data');
	view.setUint32(40, samples * 2, true);
	// As amostras ficam em zero — silêncio.

	return new Uint8Array(buffer);
}

export const stubTtsProvider: TtsProvider = {
	synthesize: async (text, _voice, speed) => {
		// ~12 caracteres por segundo, ajustado pela velocidade pedida.
		const seconds = Math.max(1, text.length / 12 / (speed || 1));
		return { audio: silentWav(seconds), contentType: 'audio/wav' };
	}
};
