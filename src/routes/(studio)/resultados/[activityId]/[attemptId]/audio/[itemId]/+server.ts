import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { prisma } from '$lib/server/db/client';
import { getObject } from '$lib/server/storage';

/**
 * A gravação de um aluno, servida ao PROFESSOR dono da atividade.
 *
 * **Por que ela não é pública como o áudio da atividade.** Aquele é o mesmo
 * conteúdo que o aluno já recebe na questão; este é a voz de uma pessoa. O
 * prefixo `fala/` não tem leitura anônima no bucket, e sem uma rota como esta
 * bastaria descobrir o endereço para ouvir a gravação de qualquer aluno.
 *
 * **O escopo está no `where`, não numa checagem antes.** É o mesmo cuidado de
 * `comentarResposta` (server.md): um `findFirst` seguido de leitura deixaria uma
 * janela entre as duas consultas, e o filtro por `teacherId` na própria busca
 * não deixa a linha de outro professor sequer aparecer (regra inviolável nº 4).
 *
 * Objeto que já expirou (7 dias) vira 404 — do ponto de vista de quem pediu é a
 * mesma coisa que não existir.
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const teacher = requireTeacher(locals);

	const resposta = await prisma.attemptItem.findFirst({
		where: {
			attemptId: params.attemptId,
			itemId: params.itemId,
			audioKey: { not: null },
			audioExpiresAt: { gt: new Date() },
			attempt: {
				publication: {
					activityVersion: {
						activity: { id: params.activityId, teacherId: teacher.id }
					}
				}
			}
		},
		select: { audioKey: true }
	});
	// Não distinga "não existe" de "não é sua": isso vaza a existência do
	// recurso (auth.md).
	if (!resposta?.audioKey) error(404, 'Gravação não encontrada');

	const objeto = await getObject(resposta.audioKey);
	if (!objeto) error(404, 'Gravação não encontrada');

	return new Response(objeto.body, {
		headers: {
			'content-type': objeto.contentType,
			...(objeto.length ? { 'content-length': String(objeto.length) } : {}),
			// PRIVADO e por pouco tempo: o cache do browser tudo bem, o de um
			// intermediário não — é a voz de um aluno, e ela some em 7 dias.
			'cache-control': 'private, max-age=300'
		}
	});
};
