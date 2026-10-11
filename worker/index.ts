import 'dotenv/config';
import { prisma } from '../src/lib/server/db/client.ts';
import {
	avisoEquipeJobSchema,
	conviteModuloJobSchema,
	conviteEscolaJobSchema,
	conviteJobSchema,
	envioProgramadoJobSchema,
	redefinirSenhaJobSchema,
	ttsJobSchema
} from '../src/lib/server/queue/index.ts';
import { getEmailProvider } from '../src/lib/server/email/index.ts';
import { montarConviteAluno } from '../src/lib/server/email/convite-aluno.ts';
import { montarAvisoEquipe } from '../src/lib/server/email/aviso-equipe.ts';
import { montarConviteModulo } from '../src/lib/server/email/convite-modulo.ts';
import { montarConviteEscola } from '../src/lib/server/email/convite-escola.ts';
import { montarRedefinirSenha } from '../src/lib/server/email/redefinir-senha.ts';
import { getTtsProvider, ttsExpiraEm, ttsObjectKey } from '../src/lib/server/tts/index.ts';
import { putObject } from '../src/lib/server/storage/index.ts';
import { origemDoWorker, processarEnviosDevidos } from '../src/lib/server/modulos/programacao.ts';

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
 * `tts/<teacherId>/<hash>`, então rodar o mesmo job duas vezes reescreve o
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

/**
 * O convite de módulo: um e-mail com todas as atividades. Idempotente pelos
 * `sentAt` dos convites que ele entrega — se nenhum está pendente, já saiu.
 * Marca TODOS depois de enviar, numa escrita só.
 */
async function processConviteModulo(payload: unknown): Promise<void> {
	const job = conviteModuloJobSchema.parse(payload);
	const pendentes = await prisma.invite.count({
		where: { id: { in: job.inviteIds }, sentAt: null }
	});
	if (pendentes === 0) return;

	const email = montarConviteModulo(job);
	await getEmailProvider().send({ ...email, to: job.to });

	await prisma.invite.updateMany({
		where: { id: { in: job.inviteIds }, sentAt: null },
		data: { sentAt: new Date() }
	});
}

/**
 * O convite de escola. Idempotente por `sentAt`, e não manda convite que já foi
 * aceito, revogado (apagado) ou vencido — chegaria um link que não abre.
 */
async function processConviteEscola(payload: unknown): Promise<void> {
	const job = conviteEscolaJobSchema.parse(payload);
	const convite = await prisma.schoolInvite.findUnique({ where: { id: job.inviteId } });
	if (!convite || convite.sentAt || convite.acceptedAt || convite.expiresAt <= new Date()) return;

	await getEmailProvider().send({ ...montarConviteEscola(job), to: job.to });
	await prisma.schoolInvite.update({ where: { id: job.inviteId }, data: { sentAt: new Date() } });
}

/**
 * O aviso para a equipe. Sem `CONTATO_PARA` ele vai para o log — o mesmo
 * comportamento de e-mail sem provedor —, porque o pedido já está gravado no
 * banco e o painel o mostra de qualquer jeito. Não é idempotente por marca (não
 * há linha de envio): repetir manda de novo, e um aviso duplicado para a
 * equipe é inofensivo.
 */
/**
 * O envio programado de um módulo (docs/telas-modulos-professor.md 2.4). O job
 * só diz QUAL alocação acordar; o que sai é decidido pelo banco na hora, então
 * um job de uma data que mudou acorda, não acha nada devido, e termina.
 */
async function processEnvioProgramado(payload: unknown): Promise<void> {
	const job = envioProgramadoJobSchema.parse(payload);
	await processarEnviosDevidos(job.allocationId, origemDoWorker());
}

async function processAvisoEquipe(payload: unknown): Promise<void> {
	const job = avisoEquipeJobSchema.parse(payload);
	const para = process.env.CONTATO_PARA;
	const email = montarAvisoEquipe(job);
	if (!para) {
		console.info(
			`[aviso-equipe] CONTATO_PARA vazio — "${job.assunto}"\n${job.texto.replace(/^/gm, '  ')}`
		);
		return;
	}
	await getEmailProvider().send({ ...email, to: para, replyTo: job.replyTo });
}

/**
 * O link de redefinir senha. Link vencido na fila não sai: chegaria dizendo
 * "vale por 1 hora" e abriria em "link expirado". Rodar duas vezes manda o
 * mesmo link duas vezes — inofensivo, e melhor que não mandar nenhum.
 */
async function processRedefinirSenha(payload: unknown): Promise<void> {
	const job = redefinirSenhaJobSchema.parse(payload);
	if (new Date(job.expiraEm) <= new Date()) return;
	await getEmailProvider().send({ ...montarRedefinirSenha(job), to: job.to });
}

async function processJob(job: ClaimedJob): Promise<void> {
	// Todo handler precisa ser idempotente: o mesmo job pode rodar mais de uma
	// vez se o worker cair entre concluir o trabalho e marcar `done`.
	switch (job.type) {
		case 'tts':
			return processTts(job.payload);
		case 'convite':
			return processConvite(job.payload);
		case 'convite-escola':
			return processConviteEscola(job.payload);
		case 'convite-modulo':
			return processConviteModulo(job.payload);
		case 'aviso-equipe':
			return processAvisoEquipe(job.payload);
		case 'redefinir-senha':
			return processRedefinirSenha(job.payload);
		case 'envio-programado':
			return processEnvioProgramado(job.payload);
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
