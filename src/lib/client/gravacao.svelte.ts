import { browser } from '$app/environment';

/**
 * A captura do microfone para a questão de FALA.
 *
 * Mora aqui, e não dentro do `Recorder.svelte`, porque o componente é
 * controlado por desenho (components.md "Gravação"): ele recebe `recording` e
 * `ontoggle` e não fala com o `MediaRecorder` sozinho. Quem usa é a tela da
 * questão.
 *
 * **A gravação termina sozinha quando o aluno para de falar.** Antes ela
 * dependia de um segundo toque, e isso cobrava dele uma tarefa que não é a do
 * exercício: dizer a frase E lembrar de encerrar. Quem esquecia mandava cinco
 * segundos de sala de aula depois da resposta — e o Whisper transcreve o
 * vizinho junto. O toque continua funcionando como saída manual, para quem
 * quiser cortar antes.
 *
 * **Nada disto pode travar o exercício.** Microfone negado, aparelho sem
 * entrada, aba sem HTTPS — tudo vira uma mensagem e o botão "Pular" continua
 * no rodapé (design-system.md: em `speak` o pular está sempre visível).
 */

export type EstadoDaGravacao = 'ocioso' | 'gravando' | 'pronto' | 'negado' | 'indisponivel';

/**
 * `webm/opus` é o que o Chrome e o Firefox produzem; o Safari só faz `mp4`.
 * A lista é uma ordem de preferência — o serviço de áudio decodifica o que o
 * ffmpeg ler, então qualquer uma serve.
 */
const FORMATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function primeiroFormatoSuportado(): string | undefined {
	if (typeof MediaRecorder === 'undefined') return undefined;
	return FORMATOS.find((tipo) => MediaRecorder.isTypeSupported(tipo));
}

/** De quanto em quanto tempo o nível do microfone é medido. */
const INTERVALO_MS = 50;

/**
 * Quanto silêncio encerra a gravação, depois de o aluno ter falado.
 *
 * 1,1 s é mais que a pausa entre palavras de uma frase falada devagar e menos
 * que o tempo que alguém leva para perceber que já acabou. Abaixo de 1 s a
 * gravação corta no meio de quem hesita; acima de 1,5 s ela colhe o barulho da
 * sala depois da resposta.
 */
const SILENCIO_PARA_ENCERRAR_MS = 1100;

/** Quanto se espera pela primeira palavra antes de desistir e mandar o que houver. */
const ESPERA_PELA_FALA_MS = 4000;

/**
 * O nível é medido em relação ao RUÍDO DE FUNDO, não contra um valor fixo.
 *
 * Um limiar absoluto funciona no quarto de quem escreveu o código e falha na
 * sala de aula com trinta pessoas: ali o silêncio já está acima dele e a
 * gravação nunca terminaria. Estes 300 ms iniciais medem o ambiente daquele
 * aluno, naquele aparelho.
 */
const CALIBRAGEM_MS = 300;
/** Quantas vezes acima do ruído de fundo conta como fala. */
const FATOR_ACIMA_DO_RUIDO = 2.5;
/** Piso absoluto: num microfone mudo o ruído é ~0, e 2,5× de zero continua zero. */
const PISO_DE_FALA = 0.012;

export class Gravacao {
	estado = $state<EstadoDaGravacao>('ocioso');
	/** O que foi gravado, pronto para subir. */
	blob = $state<Blob | null>(null);
	/** Quanto tempo já dura a gravação, em segundos — o aluno precisa ver isso. */
	segundos = $state(0);
	/** `true` enquanto o nível está acima do limiar. A tela usa para mostrar que está captando. */
	falando = $state(false);

	#recorder: MediaRecorder | null = null;
	#stream: MediaStream | null = null;
	#pedacos: Blob[] = [];
	#relogio: ReturnType<typeof setInterval> | undefined;

	#ctx: AudioContext | null = null;
	#analisador: AnalyserNode | null = null;
	#amostras: Float32Array<ArrayBuffer> | null = null;

	#decorridoMs = 0;
	#ruidoDeFundo = 0;
	#amostrasDeCalibragem = 0;
	#jaFalou = false;
	#silencioMs = 0;

	/**
	 * Teto duro. Dez segundos é mais do que qualquer frase de exercício, e o
	 * limite existe dos dois lados: ASR é cobrado por minuto, e uma gravação
	 * longa é quase sempre um microfone que ficou aberto por engano.
	 */
	readonly maxSegundos = 10;

	get disponivel(): boolean {
		return browser && !!navigator.mediaDevices && typeof MediaRecorder !== 'undefined';
	}

	async iniciar(): Promise<void> {
		if (this.estado === 'gravando') return;
		if (!this.disponivel) {
			this.estado = 'indisponivel';
			return;
		}

		try {
			this.#stream = await navigator.mediaDevices.getUserMedia({
				// Ganho e ruído automáticos: a gravação é num celular, numa sala com
				// trinta pessoas. Sem isso o Whisper transcreve o vizinho.
				audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
			});
		} catch {
			// `getUserMedia` rejeita tanto para permissão negada quanto para
			// aparelho sem microfone. Para o aluno as duas coisas são a mesma:
			// não dá para gravar agora.
			this.estado = 'negado';
			return;
		}

		const mimeType = primeiroFormatoSuportado();
		this.#pedacos = [];
		this.blob = null;
		this.segundos = 0;
		this.falando = false;
		this.#decorridoMs = 0;
		this.#ruidoDeFundo = 0;
		this.#amostrasDeCalibragem = 0;
		this.#jaFalou = false;
		this.#silencioMs = 0;

		this.#recorder = new MediaRecorder(this.#stream, mimeType ? { mimeType } : undefined);
		this.#recorder.ondataavailable = (evento) => {
			if (evento.data.size > 0) this.#pedacos.push(evento.data);
		};
		this.#recorder.onstop = () => {
			this.blob = new Blob(this.#pedacos, { type: mimeType ?? 'audio/webm' });
			this.estado = this.blob.size > 0 ? 'pronto' : 'ocioso';
			this.falando = false;
			this.#soltarMicrofone();
		};

		this.#ligarMedidor();
		this.#recorder.start();
		this.estado = 'gravando';
		this.#relogio = setInterval(() => this.#tick(), INTERVALO_MS);
	}

	/**
	 * Um passo do medidor: mede o nível, decide se é fala, e encerra quando for
	 * o caso. Roda a cada 50 ms — o mesmo relógio que atualiza o contador.
	 */
	#tick(): void {
		this.#decorridoMs += INTERVALO_MS;
		this.segundos = Math.floor(this.#decorridoMs / 1000);

		if (this.#decorridoMs >= this.maxSegundos * 1000) {
			void this.parar();
			return;
		}

		const nivel = this.#nivel();
		if (nivel === null) return;

		// Os primeiros 300 ms são o ambiente, não a resposta: mede-se o ruído de
		// fundo daquele aluno naquele aparelho para o limiar fazer sentido.
		if (this.#decorridoMs <= CALIBRAGEM_MS) {
			this.#amostrasDeCalibragem += 1;
			this.#ruidoDeFundo += (nivel - this.#ruidoDeFundo) / this.#amostrasDeCalibragem;
			return;
		}

		const limiar = Math.max(this.#ruidoDeFundo * FATOR_ACIMA_DO_RUIDO, PISO_DE_FALA);
		this.falando = nivel > limiar;

		if (this.falando) {
			this.#jaFalou = true;
			this.#silencioMs = 0;
			return;
		}

		this.#silencioMs += INTERVALO_MS;

		// A contagem de silêncio só encerra DEPOIS de ter havido fala. Antes
		// disso o aluno ainda está se preparando, e cortar aí mandaria um
		// arquivo vazio para o serviço de áudio.
		if (this.#jaFalou && this.#silencioMs >= SILENCIO_PARA_ENCERRAR_MS) {
			void this.parar();
			return;
		}
		if (!this.#jaFalou && this.#decorridoMs >= ESPERA_PELA_FALA_MS) {
			// Ninguém falou. Encerra assim mesmo: o aluno vê "gravado" e decide se
			// regrava ou pula, em vez de ficar olhando um contador que não anda.
			void this.parar();
		}
	}

	/** RMS do quadro atual, de 0 a ~1. `null` quando não há analisador. */
	#nivel(): number | null {
		if (!this.#analisador || !this.#amostras) return null;
		this.#analisador.getFloatTimeDomainData(this.#amostras);
		let soma = 0;
		for (const amostra of this.#amostras) soma += amostra * amostra;
		return Math.sqrt(soma / this.#amostras.length);
	}

	#ligarMedidor(): void {
		if (!this.#stream) return;
		try {
			this.#ctx = new AudioContext();
			const fonte = this.#ctx.createMediaStreamSource(this.#stream);
			this.#analisador = this.#ctx.createAnalyser();
			// 1024 amostras a 48 kHz são ~21 ms — resolução de sobra para medir
			// energia, e barato o bastante para rodar a cada 50 ms num celular.
			this.#analisador.fftSize = 1024;
			this.#amostras = new Float32Array(this.#analisador.fftSize);
			fonte.connect(this.#analisador);
		} catch {
			// Sem Web Audio não há detecção de silêncio; sobra o teto de tempo, e
			// o toque manual continua encerrando. Gravar não deixa de funcionar.
			this.#analisador = null;
			this.#amostras = null;
		}
	}

	async parar(): Promise<void> {
		clearInterval(this.#relogio);
		this.#relogio = undefined;
		if (this.#recorder && this.#recorder.state !== 'inactive') {
			this.#recorder.stop();
		} else {
			this.#soltarMicrofone();
		}
	}

	/** Zera para a próxima questão. A tela reusa o mesmo componente entre elas. */
	descartar(): void {
		clearInterval(this.#relogio);
		this.#relogio = undefined;
		if (this.#recorder && this.#recorder.state !== 'inactive') this.#recorder.stop();
		this.#soltarMicrofone();
		this.#pedacos = [];
		this.blob = null;
		this.segundos = 0;
		this.falando = false;
		this.estado = 'ocioso';
	}

	/**
	 * Desliga o microfone de verdade. Sem isto o indicador de gravação do
	 * browser fica aceso depois da questão — e, com razão, o aluno acha que o
	 * site continua ouvindo.
	 */
	#soltarMicrofone(): void {
		this.#stream?.getTracks().forEach((faixa) => faixa.stop());
		this.#stream = null;
		this.#recorder = null;
		this.#analisador = null;
		this.#amostras = null;
		void this.#ctx?.close().catch(() => {});
		this.#ctx = null;
	}
}
