import { FUSO, somarDias } from '$lib/modulos/programacao';

/**
 * A SEMANA do início do Studio (o desenho "Studio Dashboard", 1b): de segunda a
 * domingo, como o calendário de quem dá aula, com as tentativas de cada dia e
 * as marcas de hoje, do dia mais movimentado e dos dias com envio. Puro e
 * isomórfico: o servidor conta, a tela desenha.
 *
 * **O dia é o de Brasília**, a mesma régua da agenda de módulos
 * (`$lib/modulos/agenda.ts`): uma tentativa das 22h de quinta não pode cair na
 * sexta só porque o servidor roda em UTC.
 */

const CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function emUtc(dia: string): Date {
	return new Date(`${dia}T12:00:00Z`);
}

/** A segunda-feira da semana de `dia` (AAAA-MM-DD). */
export function segundaDaSemana(dia: string): string {
	return somarDias(dia, -((emUtc(dia).getUTCDay() + 6) % 7));
}

/** "seg 05 a dom 11/10"; atravessando o mês, "seg 28/09 a dom 04/10". */
export function rotuloDaSemana(segunda: string): string {
	const domingo = somarDias(segunda, 6);
	const [, m1, d1] = segunda.split('-');
	const [, m2, d2] = domingo.split('-');
	return m1 === m2 ? `seg ${d1} a dom ${d2}/${m2}` : `seg ${d1}/${m1} a dom ${d2}/${m2}`;
}

/**
 * A marca de cada barra — UMA só, nesta ordem: hoje, o dia mais movimentado, um
 * dia com envio. Duas marcas empilhadas numa coluna de 48px viram ruído.
 */
export type MarcaDoDia = 'hoje' | 'pico' | 'envio' | null;

export type BarraDoDia = {
	dia: string;
	/** "seg", "ter"… */
	rotulo: string;
	tentativas: number;
	/** A altura da barra, de 0 a 1, contra o dia mais movimentado. */
	fracao: number;
	hoje: boolean;
	/** Depois de hoje: ainda não houve tentativa, e a barra vazia não é "ninguém respondeu". */
	futuro: boolean;
	comEnvio: boolean;
	marca: MarcaDoDia;
};

/**
 * As sete barras da semana. O "mais movimentado" é o PRIMEIRO dia com o maior
 * número — empate não vira duas marcas — e só existe se alguém respondeu.
 */
export function barrasDaSemana(
	segunda: string,
	hoje: string,
	tentativasPorDia: Record<string, number>,
	diasComEnvio: readonly string[]
): BarraDoDia[] {
	const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
	const contagens = dias.map((d) => tentativasPorDia[d] ?? 0);
	const maior = Math.max(...contagens);
	const pico = maior > 0 ? dias[contagens.indexOf(maior)] : null;
	const comEnvio = new Set(diasComEnvio);
	return dias.map((dia, i) => {
		const ehHoje = dia === hoje;
		const envio = comEnvio.has(dia);
		return {
			dia,
			// i = 0 é segunda: o índice de `CURTO` começa no domingo.
			rotulo: CURTO[(i + 1) % 7],
			tentativas: contagens[i],
			fracao: maior > 0 ? contagens[i] / maior : 0,
			hoje: ehHoje,
			futuro: dia > hoje,
			comEnvio: envio,
			marca: ehHoje ? 'hoje' : dia === pico ? 'pico' : envio ? 'envio' : null
		};
	});
}

/** O que o leitor de tela ouve no lugar do gráfico: "seg 9, ter 14, qua 6…". */
export function descricaoDasBarras(barras: readonly BarraDoDia[]): string {
	return `Tentativas por dia nesta semana: ${barras.map((b) => `${b.rotulo} ${b.tentativas}`).join(', ')}`;
}

const HORA = new Intl.DateTimeFormat('pt-BR', {
	timeZone: FUSO,
	hour: '2-digit',
	hourCycle: 'h23'
});

/** "Bom dia" das 5h ao meio-dia, "Boa tarde" até as 18h, "Boa noite" no resto — em Brasília. */
export function saudacao(agora: Date = new Date()): string {
	const hora = Number(HORA.format(agora));
	if (hora >= 5 && hora < 12) return 'Bom dia';
	if (hora >= 12 && hora < 18) return 'Boa tarde';
	return 'Boa noite';
}
