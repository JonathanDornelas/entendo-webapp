import type { CorDeEtiqueta } from '$lib/etiquetas';
import { FUSO, rotuloDaData, somarDias } from './programacao';

/**
 * A AGENDA dos envios de módulo — o que sai, de que módulo, para que turma e em
 * que dia —, desenhada de três jeitos: os "Próximos 7 dias" da lista de módulos
 * e do módulo aberto, e o calendário do mês (docs/telas-modulos-professor.md).
 * Puro e isomórfico: o servidor monta os eventos a partir de `ModuleSend`, a
 * tela agrupa e filtra.
 *
 * **O dia é o de Brasília**, a mesma régua de `agendar` e da prévia: um envio
 * das 22h de quinta não pode aparecer na sexta só porque o servidor roda em UTC.
 */

/**
 * Como um envio aparece no calendário. "rascunho" é um envio PROGRAMADO cuja
 * atividade ainda não está no ar — ele espera ser publicada, e a tela avisa
 * antes da data, não depois.
 */
export type EstadoNoCalendario = 'programada' | 'rascunho' | 'enviada' | 'nao_saiu';

export type EventoDeEnvio = {
	/** `alocação:atividade` — uma linha de `ModuleSend`. */
	id: string;
	alocacaoId: string;
	/** AAAA-MM-DD, em Brasília. */
	dia: string;
	/** "8h", "7h30". */
	hora: string;
	estado: EstadoNoCalendario;
	motivo: 'rascunho' | 'arquivada' | 'audio' | null;
	/** Enviada: os e-mails que saíram. Programada: os que vão sair (alunos com e-mail). */
	emails: number;
	/** Falso no "só disponibilizar": a atividade abre no mapa e ninguém recebe e-mail. */
	porEmail: boolean;
	modulo: { id: string; nome: string; cor: CorDeEtiqueta; sigla: string };
	turma: { id: string; nome: string; cor: CorDeEtiqueta; sigla: string };
	atividade: { id: string; titulo: string };
};

const DIA = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO });
const HORA = new Intl.DateTimeFormat('pt-BR', {
	timeZone: FUSO,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** O dia de um instante, em Brasília. */
export function diaEmBrasilia(d: Date): string {
	return DIA.format(d);
}

/** "8h", "7h30" — o horário de um instante, em Brasília. */
export function horaEmBrasilia(d: Date): string {
	const [h, m] = HORA.format(d).split(':');
	return `${Number(h)}h${m === '00' ? '' : m}`;
}

const MESES = [
	'janeiro',
	'fevereiro',
	'março',
	'abril',
	'maio',
	'junho',
	'julho',
	'agosto',
	'setembro',
	'outubro',
	'novembro',
	'dezembro'
];
const LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function emUtc(dia: string): Date {
	return new Date(`${dia}T12:00:00Z`);
}

/** "segunda, 12 de outubro". */
export function diaPorExtenso(dia: string): string {
	const d = emUtc(dia);
	return `${LONGO[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** "Outubro de 2026" — `mes` no formato AAAA-MM. */
export function nomeDoMes(mes: string): string {
	const [ano, m] = mes.split('-').map(Number);
	const nome = MESES[m - 1];
	return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

/** AAAA-MM somado de `n` meses. */
export function somarMesesAoMes(mes: string, n: number): string {
	const [ano, m] = mes.split('-').map(Number);
	const total = ano * 12 + (m - 1) + n;
	return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Os eventos agrupados por dia. */
export function porDia(eventos: EventoDeEnvio[]): Record<string, EventoDeEnvio[]> {
	const mapa: Record<string, EventoDeEnvio[]> = {};
	for (const e of eventos) (mapa[e.dia] ??= []).push(e);
	return mapa;
}

/**
 * Um envio de UMA turma num dia: as atividades daquele dia viram um cartão só —
 * é um e-mail por aluno por data, com tudo o que sai nela.
 */
export type EnvioDoDia = {
	chave: string;
	alocacaoId: string;
	moduloId: string;
	turma: EventoDeEnvio['turma'];
	modulo: EventoDeEnvio['modulo'];
	hora: string;
	/** A primeira atividade e "+N" quando sai mais de uma. */
	titulo: string;
	/** Alguma ainda é rascunho: sai só se for publicada até lá. */
	rascunho: boolean;
	/** "7º B — inglês · Frutas 3 — receita, Frutas 4 — diálogo". */
	descricao: string;
};

export type DiaDaSemana = {
	dia: string;
	/** "hoje", "seg", "ter"… */
	rotulo: string;
	/** "12/10". */
	data: string;
	hoje: boolean;
	envios: EnvioDoDia[];
};

/**
 * Os próximos `n` dias a partir de `hoje`, com o que ainda vai sair — só o
 * PROGRAMADO (no ar ou rascunho). O que não saiu tem o aviso próprio, em
 * vermelho, e o que já saiu é histórico.
 */
export function proximosDias(eventos: EventoDeEnvio[], hoje: string, n = 7): DiaDaSemana[] {
	const futuros = eventos.filter((e) => e.estado === 'programada' || e.estado === 'rascunho');
	const mapa = porDia(futuros);
	return Array.from({ length: n }, (_, i) => {
		const dia = somarDias(hoje, i);
		const doDia = mapa[dia] ?? [];
		const grupos = new Map<string, EventoDeEnvio[]>();
		for (const e of doDia) {
			const lista = grupos.get(e.alocacaoId) ?? [];
			lista.push(e);
			grupos.set(e.alocacaoId, lista);
		}
		const [, mes, d] = dia.split('-');
		return {
			dia,
			rotulo: i === 0 ? 'hoje' : CURTO[emUtc(dia).getUTCDay()],
			data: `${d}/${mes}`,
			hoje: i === 0,
			envios: [...grupos.values()].map((lista) => {
				const [primeiro] = lista;
				return {
					chave: `${primeiro.alocacaoId}:${dia}`,
					alocacaoId: primeiro.alocacaoId,
					moduloId: primeiro.modulo.id,
					turma: primeiro.turma,
					modulo: primeiro.modulo,
					hora: primeiro.hora,
					titulo: primeiro.atividade.titulo + (lista.length > 1 ? ` +${lista.length - 1}` : ''),
					rascunho: lista.some((e) => e.estado === 'rascunho'),
					descricao: `${primeiro.turma.nome} · ${lista.map((e) => e.atividade.titulo).join(', ')}`
				};
			})
		};
	});
}

export type CelulaDoMes = {
	dia: string;
	numero: number;
	/** Dia do mês anterior ou do seguinte, que só completa a semana. */
	fora: boolean;
	hoje: boolean;
	eventos: EventoDeEnvio[];
};

/** A grade do mês, de segunda a domingo (como o calendário de quem dá aula), em semanas inteiras. */
export function gradeDoMes(
	mes: string,
	eventosPorDia: Record<string, EventoDeEnvio[]>,
	hoje: string
): CelulaDoMes[] {
	const primeiro = `${mes}-01`;
	const recuo = (emUtc(primeiro).getUTCDay() + 6) % 7;
	const inicio = somarDias(primeiro, -recuo);
	const [ano, m] = mes.split('-').map(Number);
	const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate();
	const total = Math.ceil((recuo + diasNoMes) / 7) * 7;
	return Array.from({ length: total }, (_, i) => {
		const dia = somarDias(inicio, i);
		const fora = !dia.startsWith(mes);
		return {
			dia,
			numero: Number(dia.slice(8)),
			fora,
			hoje: dia === hoje,
			eventos: fora ? [] : (eventosPorDia[dia] ?? [])
		};
	});
}

/** O rótulo do dia na lista do mês: "seg 12/10". */
export const rotuloDoDia = rotuloDaData;
