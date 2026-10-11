import { z } from 'zod';
import { command, getRequestEvent } from '$app/server';
import { requireTeacher } from '$lib/server/auth/guard';
import { requireCoordenacao } from '$lib/server/escola/guard';
import { escola } from '$lib/server/db/repos/escola';
import {
	aceitarConviteDaEscola,
	convidarEEnviar,
	removerDaEscola
} from '$lib/server/escola/escolas';

/**
 * A coordenação da escola e o aceite do convite (docs/adr-005-escola.md).
 * **Toda remote function é um endpoint HTTP público** (regra nº 3) e não passa
 * pelo hook: as da coordenação abrem com `requireCoordenacao` (404 para quem não
 * coordena); o aceite, com `requireTeacher` — o id vem da sessão, nunca do corpo.
 */

/** Convida um professor (ou outra pessoa da coordenação). O e-mail sai pela fila. */
export const convidarProfessor = command(
	z.object({
		email: z.string().trim().email('Esse e-mail não parece válido.'),
		role: z.enum(['coordenacao', 'professor']).default('professor')
	}),
	async ({ email, role }) => {
		const event = getRequestEvent();
		const scope = await requireCoordenacao(event.locals);
		const quem = requireTeacher(event.locals);
		return convidarEEnviar(scope.schoolId, email, role, quem.name, event.url.origin);
	}
);

export const revogarConvite = command(z.object({ inviteId: z.string() }), async ({ inviteId }) => {
	const scope = await requireCoordenacao(getRequestEvent().locals);
	return { ok: await escola(scope).revogarConvite(inviteId) };
});

/** Tira um professor da escola — nunca a última pessoa da coordenação. O conteúdo dele fica com ele. */
export const removerProfessor = command(
	z.object({ teacherId: z.string() }),
	async ({ teacherId }) => {
		const scope = await requireCoordenacao(getRequestEvent().locals);
		return removerDaEscola(scope.schoolId, teacherId, 'professor');
	}
);

/** Aceitar o convite: o TOKEN é a prova (foi para aquele e-mail), a conta é a da sessão. */
export const aceitarConvite = command(
	z.object({ token: z.string().min(16) }),
	async ({ token }) => {
		const teacher = requireTeacher(getRequestEvent().locals);
		return aceitarConviteDaEscola(token, teacher.id);
	}
);
