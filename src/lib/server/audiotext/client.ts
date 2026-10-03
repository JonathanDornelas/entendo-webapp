/**
 * O cliente do `audiotext-service` — Whisper e Kokoro-82M atrás de HTTP.
 *
 * Um módulo só para os dois provedores porque a autenticação, o endereço e o
 * tratamento de erro são os mesmos; o que muda é a rota.
 *
 * `process.env` (e não `$env/dynamic/private`) porque o WORKER importa isto
 * fora do runtime do SvelteKit — mesma razão de `db/client.ts` e de
 * `server/tts/index.ts`.
 */

export class AudiotextError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'AudiotextError';
	}
}

function baseUrl(): string {
	const url = process.env.AUDIOTEXT_URL;
	if (!url) {
		throw new Error(
			'AUDIOTEXT_URL não configurada — o serviço de áudio é quem sintetiza e transcreve.'
		);
	}
	return url.replace(/\/+$/, '');
}

function authHeaders(): Record<string, string> {
	const token = process.env.AUDIOTEXT_TOKEN;
	return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Toda chamada tem prazo. O serviço mantém os modelos na memória e responde em
 * centenas de milissegundos; se estiver baixando os pesos ele responde 503 na
 * hora, e não pendurado. Um `fetch` sem prazo aqui prenderia um worker da fila
 * para sempre.
 */
function comPrazo(ms: number): AbortSignal {
	return AbortSignal.timeout(ms);
}

async function erroDaResposta(resposta: Response): Promise<AudiotextError> {
	let detalhe = resposta.statusText;
	try {
		const corpo = (await resposta.json()) as { detail?: unknown; error?: unknown };
		detalhe = String(corpo.detail ?? corpo.error ?? detalhe);
	} catch {
		// Corpo não-JSON (um 502 de proxy, por exemplo). Fica o statusText.
	}
	return new AudiotextError(`audiotext ${resposta.status}: ${detalhe}`, resposta.status);
}

/** Texto → voz. Devolve o arquivo tal como veio; quem grava é o storage. */
export async function sintetizar(
	text: string,
	voice: string,
	speed: number,
	timeoutMs = 60_000
): Promise<{ audio: Uint8Array; contentType: string }> {
	const resposta = await fetch(`${baseUrl()}/v1/tts/speak`, {
		method: 'POST',
		headers: { ...authHeaders(), 'content-type': 'application/json' },
		// **MP3, não WAV.** Voz mono de 24 kHz comprime ~6x (medido: 222 kB → 35 kB
		// numa frase de 4,6 s), e o que se perde é inaudível na faixa da fala —
		// conferido pelo caminho mais duro que existe: o Whisper transcreve o MP3
		// palavra por palavra igual ao WAV. Cada questão de escuta são dois
		// arquivos, servidos a cada aluno que abre o link.
		body: JSON.stringify({ text, voice, speed, format: 'mp3' }),
		signal: comPrazo(timeoutMs)
	});
	if (!resposta.ok) throw await erroDaResposta(resposta);

	return {
		audio: new Uint8Array(await resposta.arrayBuffer()),
		contentType: resposta.headers.get('content-type') ?? 'audio/mpeg'
	};
}

/**
 * Voz → texto. `hints` são os termos que o modelo tenderia a escrever errado —
 * vêm de `LanguageProfile.asr.hints` e do próprio item.
 *
 * `language` é opcional mas quase sempre conhecido aqui, e informar melhora
 * muito: a detecção automática erra em áudio curto, e uma fala de um segundo
 * vira outro idioma com frequência.
 */
export async function transcrever(
	audio: Uint8Array,
	opcoes: { language?: string; hints?: string[]; contentType?: string } = {},
	timeoutMs = 60_000
): Promise<{ text: string; language: string }> {
	const form = new FormData();
	form.append(
		'file',
		new Blob([audio as BlobPart], { type: opcoes.contentType ?? 'audio/webm' }),
		'fala.webm'
	);
	if (opcoes.language) form.append('language', opcoes.language);
	if (opcoes.hints?.length) form.append('hints', opcoes.hints.join(','));

	const resposta = await fetch(`${baseUrl()}/v1/asr/transcribe`, {
		method: 'POST',
		headers: authHeaders(),
		body: form,
		signal: comPrazo(timeoutMs)
	});
	if (!resposta.ok) throw await erroDaResposta(resposta);

	const corpo = (await resposta.json()) as { text?: unknown; language?: unknown };
	return {
		text: typeof corpo.text === 'string' ? corpo.text : '',
		language: typeof corpo.language === 'string' ? corpo.language : ''
	};
}

/**
 * O idioma em que o serviço SINTETIZA. É a lista do Kokoro-82M (nove), não a
 * do Whisper (~99) — e essa assimetria é o motivo de existir.
 */
export async function idiomasComVoz(timeoutMs = 10_000): Promise<string[]> {
	const resposta = await fetch(`${baseUrl()}/v1/info`, {
		headers: authHeaders(),
		signal: comPrazo(timeoutMs)
	});
	if (!resposta.ok) throw await erroDaResposta(resposta);
	const corpo = (await resposta.json()) as { languages?: { tts?: unknown } };
	const lista = corpo.languages?.tts;
	return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [];
}
