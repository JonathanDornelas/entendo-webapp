import { z } from 'zod';
import { prisma } from '$lib/server/db/client';

/**
 * Fila em tabela Postgres, sem Redis — ver server.md "Fila". O worker faz o
 * poll com `SELECT ... FOR UPDATE SKIP LOCKED`; aqui só entra quem enfileira.
 *
 * Todo job precisa ser idempotente: o mesmo job pode rodar mais de uma vez
 * se o worker cair entre concluir o trabalho e marcar `done`.
 */

export const ttsJobSchema = z.object({
	hash: z.string(),
	text: z.string(),
	voice: z.string(),
	speed: z.number(),
	/** O dono. O áudio é identificado pelo CONTEÚDO (o hash) e escopado por professor (db.md). */
	teacherId: z.string()
});
export type TtsJob = z.infer<typeof ttsJobSchema>;

export async function enqueueTts(job: TtsJob): Promise<void> {
	await prisma.job.create({ data: { type: 'tts', payload: job } });
}

/**
 * O convite do aluno. Vai pela fila porque enviar 30 e-mails na requisição
 * deixaria o professor olhando um spinner — e porque um provedor fora do ar
 * precisa ser retentativa, não erro na cara dele.
 */
export const conviteJobSchema = z.object({
	inviteId: z.string(),
	to: z.string(),
	studentName: z.string(),
	teacherName: z.string(),
	activityTitle: z.string(),
	languageLabel: z.string(),
	itemCount: z.number().int(),
	minutes: z.number().int(),
	classroomName: z.string(),
	link: z.string(),
	code: z.string().nullable(),
	codeUrl: z.string()
});
export type ConviteJob = z.infer<typeof conviteJobSchema>;

export async function enqueueConvites(jobs: ConviteJob[]): Promise<void> {
	if (jobs.length === 0) return;
	await prisma.job.createMany({
		data: jobs.map((job) => ({ type: 'convite', payload: job }))
	});
}

/** Jobs que falharam depois de esgotar as tentativas — nunca somem em silêncio. */
export function failedJobs(limit = 50) {
	return prisma.job.findMany({
		where: { status: 'failed' },
		orderBy: { updatedAt: 'desc' },
		take: limit
	});
}
