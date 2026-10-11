import { programacoes } from '$lib/server/db/repos/programacoes';
import { etiquetaDaTurma } from '$lib/etiquetas';
import { diaEmBrasilia, horaEmBrasilia, type EventoDeEnvio } from '$lib/modulos/agenda';

type Professor = { id: string };

/**
 * Os envios de módulo do professor como EVENTOS da agenda
 * (`$lib/modulos/agenda.ts`) — a mesma leitura para o calendário, para os
 * "Próximos 7 dias" da lista de módulos e para os do módulo aberto.
 *
 * - O que já saiu aparece no dia em que SAIU, com os e-mails que saíram.
 * - O programado aparece no dia marcado; se a atividade não está no ar, como
 *   "rascunho" — ele espera ser publicada, e o aviso vem antes da data.
 * - **Programação pausada fica FORA**: nada dela sai, e mostrar as datas seria
 *   prometer o que não vai acontecer. O calendário diz quais estão pausadas.
 */
export async function eventosDaAgenda(
	teacher: Professor,
	filtro: { moduleId?: string } = {}
): Promise<EventoDeEnvio[]> {
	const linhas = await programacoes(teacher).agenda(filtro);
	const eventos: EventoDeEnvio[] = [];
	for (const l of linhas) {
		if (l.status === 'pulada') continue;
		if (l.status === 'programada' && l.pausada) continue;
		const instante = l.status === 'enviada' ? (l.sentAt ?? l.dueAt) : l.dueAt;
		const estado =
			l.status === 'enviada'
				? 'enviada'
				: l.status === 'nao_saiu'
					? 'nao_saiu'
					: l.atividade.noAr
						? 'programada'
						: 'rascunho';
		eventos.push({
			id: `${l.allocationId}:${l.atividade.id}`,
			alocacaoId: l.allocationId,
			dia: diaEmBrasilia(instante),
			hora: horaEmBrasilia(instante),
			estado,
			motivo:
				l.reason ??
				(estado === 'rascunho' ? (l.atividade.arquivada ? 'arquivada' : 'rascunho') : null),
			emails: l.status === 'enviada' ? (l.emails ?? 0) : l.porEmail ? l.turma.comEmail : 0,
			porEmail: l.porEmail,
			modulo: {
				id: l.modulo.id,
				nome: l.modulo.name,
				cor: l.modulo.color,
				sigla: etiquetaDaTurma(l.modulo.name)
			},
			turma: {
				id: l.turma.id,
				nome: l.turma.name,
				cor: l.turma.color,
				sigla: etiquetaDaTurma(l.turma.name)
			},
			atividade: { id: l.atividade.id, titulo: l.atividade.title }
		});
	}
	return eventos;
}
