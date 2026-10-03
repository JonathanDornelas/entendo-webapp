import 'dotenv/config';
import { prisma } from '../src/lib/server/db/client.ts';
import { conviteJobSchema, ttsJobSchema } from '../src/lib/server/queue/index.ts';
import { getEmailProvider } from '../src/lib/server/email/index.ts';
import { montarConviteAluno } from '../src/lib/server/email/convite-aluno.ts';
import { getTtsProvider, ttsExpiraEm, ttsObjectKey } from '../src/lib/server/tts/index.ts';
import { putObject } from '../src/lib/server/storage/index.ts';

// Fila em tabela Postgres, sem Redis — ver .claude/rules/server.md "Fila". O
// `SELECT ... FOR UPDATE SKIP LOCKED` é a primitiva de exclusão mútua entre
// workers concorrentes; recupera também jobs travados em `processing` cujo
// `lockedUntil` já passou (worker anterior que caiu no meio do processamento).
/** Quanto se espera quando a fila está VAZIA. Com trabalho, não se espera nada. */
const POLL_INTERVAL_MS = 2000;
const LOCK_DURATION_MS = 60_000;
const MAX_ATTEMPTS = 5;

/**
 * Quantos jobs correm ao mesmo tempo.
 *
 * **Para TTS isto não acelera nada, e foi medido.** Dez áudios levaram 34,0 s
 * com concorrência 1, 35,4 s com 3 e 36,9 s com 6. O serviço de áudio é
 * CPU-bound nos 2 vCPU dele: duas sínteses em paralelo levam o dobro do tempo
 * de uma (1,0 s → 2,0 s), quatro levam o quádruplo. Não há vaga ociosa para
 * preencher — o modelo já usa os núcleos que existem.
 *
 * O que existe aqui é para os jobs de `convite`: enviar e-mail é espera de
 * REDE, e trinta convites em série são trinta idas e voltas somadas. Três é
 * conservador de propósito, e o teto de verdade do TTS continua sendo a
 * máquina do serviço de áudio, não este número.
 */
const CONCORRENCIA = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 3));

interface ClaimedJob {
	id: string;
	type: string;
	payload: unknown;
	attempts: number;
}

async function claimNextJob(): Promise<ClaimedJob | null> {
	return prisma.$transaction(async (tx) => {
		// Identificadores entre aspas duplas: sem elas, o Postgres dobra tudo para
		// minúsculo e "runAfter"/"lockedUntil" deixam de bater com as colunas reais
		// (o Prisma sempre cria as tabelas com o case exato entre aspas).
		const [job] = await tx.$queryRaw<ClaimedJob[]>`
			SELECT id, type, payload, attempts
			FROM "Job"
			WHERE (status = 'pending' AND "runAfter" <= NOW())
			   OR (status = 'processing' AND "lockedUntil" <= NOW())
			ORDER BY "runAfter" ASC
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		`;
		if (!job) return null;

		await tx.job.update({
			where: { id: job.id },
			data: { status: 'processing', lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }
		});

		return job;
	});
}

/**
 * Sintetiza uma fala e guarda no storage. Idempotente pela chave: ela é
 * `tts/<atividade>/<hash>`, então rodar o mesmo job duas vezes reescreve o
 * mesmo arquivo e atualiza a mesma linha.
 *
 * Job de áudio EXPIRADO é retrabalho legítimo, não duplicata: o objeto some do
 * bucket em 10 dias e a publicação reenfileira. Por isso a saída antecipada
 * olha `expiresAt`, não a mera existência da linha.
 */
async function processTts(payload: unknown): Promise<void> {
	const job = ttsJobSchema.parse(payload);

	const chave = { teacherId_hash: { teacherId: job.teacherId, hash: job.hash } };

	const existente = await prisma.mediaAsset.findUnique({ where: chave });
	if (existente && existente.expiresAt > new Date()) return;

	const { audio, contentType } = await getTtsProvider().synthesize(job.text, job.voice, job.speed);
	const url = await putObject(ttsObjectKey(job.teacherId, job.hash), audio, contentType);
	const expiresAt = ttsExpiraEm();

	await prisma.mediaAsset.upsert({
		where: chave,
		// O `update` REESCREVE o prazo: sem isso, regerar um áudio expirado
		// deixaria a linha velha e o Player continuaria achando que não existe.
		update: { url, expiresAt },
		create: { hash: job.hash, url, kind: 'audio', expiresAt, teacherId: job.teacherId }
	});
}

/**
 * Manda o convite e marca o convite como enviado. Idempotente pelo
 * `sentAt`: reprocessar não manda de novo, porque o segundo e-mail idêntico
 * na caixa do aluno é pior do que não reprocessar.
 */
async function processConvite(payload: unknown): Promise<void> {
	const job = conviteJobSchema.parse(payload);

	const convite = await prisma.invite.findUnique({ where: { id: job.inviteId } });
	if (!convite || convite.sentAt) return;

	const email = montarConviteAluno(job);
	await getEmailProvider().send({ ...email, to: job.to });

	await prisma.invite.update({ where: { id: job.inviteId }, data: { sentAt: new Date() } });
}

async function processJob(job: ClaimedJob): Promise<void> {
	// Todo handler precisa ser idempotente: o mesmo job pode rodar mais de uma
	// vez se o worker cair entre concluir o trabalho e marcar `done`.
	switch (job.type) {
		case 'tts':
			return processTts(job.payload);
		case 'convite':
			return processConvite(job.payload);
		default:
			throw new Error(`Nenhum handler registrado para o tipo de job "${job.type}"`);
	}
}

/** Processa um job e resolve o desfecho dele. Nunca rejeita. */
async function executar(job: ClaimedJob): Promise<void> {
	try {
		await processJob(job);
		await prisma.job.update({ where: { id: job.id }, data: { status: 'done' } });
	} catch (err) {
		const attempts = job.attempts + 1;
		const exhausted = attempts >= MAX_ATTEMPTS;

		await prisma.job.update({
			where: { id: job.id },
			data: {
				status: exhausted ? 'failed' : 'pending',
				attempts,
				lastError: err instanceof Error ? err.message : String(err),
				runAfter: exhausted ? undefined : new Date(Date.now() + 2 ** attempts * 1000)
			}
		});
	}
}

/**
 * Pega até `CONCORRENCIA` jobs e processa os três juntos. Devolve quantos
 * pegou — zero significa fila vazia.
 *
 * O `claim` continua sendo um de cada vez, e tem de continuar: é o
 * `FOR UPDATE SKIP LOCKED` que dá exclusão mútua entre workers, e pegar em
 * lote numa transação só seguraria as linhas por mais tempo sem ganhar nada —
 * o custo aqui é a síntese, não a consulta.
 */
async function drenar(): Promise<number> {
	const lote: ClaimedJob[] = [];
	for (let i = 0; i < CONCORRENCIA; i++) {
		const job = await claimNextJob();
		if (!job) break;
		lote.push(job);
	}
	if (lote.length === 0) return 0;

	// `Promise.all` e não `allSettled`: `executar` já trata o próprio erro e
	// nunca rejeita — um job que falha marca a si mesmo e não derruba os irmãos.
	await Promise.all(lote.map((job) => executar(job)));
	return lote.length;
}

async function main(): Promise<void> {
	for (;;) {
		// **Só dorme quando não há o que fazer.** Antes o `setTimeout` rodava
		// depois de CADA job, então publicar dez áudios custava vinte segundos de
		// sono puro — mais do que a síntese inteira levava. Medido nos mesmos dez
		// áudios: 53,9 s antes, 35,4 s depois. O ganho é este; a concorrência
		// acima não muda o número (ver `CONCORRENCIA`).
		const feitos = await drenar();
		if (feitos === 0) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
}

main();
