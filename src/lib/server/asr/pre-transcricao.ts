import { createHash } from 'node:crypto';

/**
 * A transcrição feita ANTES de o aluno apertar "Verificar".
 *
 * A gravação para sozinha, o áudio sobe na hora e o aluno vê o que o serviço
 * entendeu — e decide se envia ou grava de novo. Quando ele envia, o mesmo
 * áudio chega de novo ao endpoint: sem esta memória, o Whisper rodaria duas
 * vezes sobre os mesmos bytes, e o serviço de áudio é CPU-bound nos 2 vCPU dele
 * (server.md "Fila"). A chave é o par tentativa/item e o valor carrega o hash
 * dos bytes: se o aluno regravou, o hash não bate e a transcrição é refeita.
 *
 * Mora na memória do processo web. É a escolha certa para o que é: um cache de
 * minutos, de dado que se reconstrói a qualquer custo baixo. O compose sobe UM
 * processo web; se um dia houver dois, o pior caso é transcrever de novo.
 */

const VIDA_MS = 10 * 60 * 1000;
const TETO = 500;

interface Entrada {
	hash: string;
	transcript: string;
	expiraEm: number;
}

const memoria = new Map<string, Entrada>();

export function hashDoAudio(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}

function chave(attemptId: string, itemId: string): string {
	return `${attemptId}:${itemId}`;
}

export function guardarTranscricao(
	attemptId: string,
	itemId: string,
	hash: string,
	transcript: string
): void {
	const agora = Date.now();
	// Varre o vencido antes de crescer; se ainda assim passar do teto, o mais
	// antigo sai — a ordem de inserção do `Map` é a idade.
	for (const [k, entrada] of memoria) if (entrada.expiraEm <= agora) memoria.delete(k);
	if (memoria.size >= TETO) {
		const primeira = memoria.keys().next().value;
		if (primeira !== undefined) memoria.delete(primeira);
	}
	memoria.set(chave(attemptId, itemId), { hash, transcript, expiraEm: agora + VIDA_MS });
}

/** A transcrição destes bytes, se ela já foi feita e ainda vale. */
export function transcricaoGuardada(
	attemptId: string,
	itemId: string,
	hash: string
): string | null {
	const entrada = memoria.get(chave(attemptId, itemId));
	if (!entrada) return null;
	if (entrada.expiraEm <= Date.now() || entrada.hash !== hash) {
		memoria.delete(chave(attemptId, itemId));
		return null;
	}
	return entrada.transcript;
}
