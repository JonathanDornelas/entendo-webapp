/**
 * O ciclo MENSAL dos créditos de IA (docs/adr-003-ia-gemini.md). Puro e
 * isomórfico.
 *
 * O ciclo é ancorado no dia em que o plano foi ativado (`Teacher.cycleAnchor`),
 * não no dia 1º: quem assinou no dia 20 tem créditos renovados todo dia 20. E é
 * mensal mesmo no plano anual — a franquia é "por mês".
 *
 * Âncora no dia 31 (ou 29/30) cai no último dia dos meses que não têm aquele
 * dia — fevereiro não pula o ciclo inteiro.
 */

function ultimoDiaDoMes(ano: number, mes: number): number {
	return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

/** A âncora levada para o mês `deslocamento` meses depois dela, no mesmo horário. */
function mesDaAncora(ancora: Date, deslocamento: number): Date {
	const totalMeses = ancora.getUTCFullYear() * 12 + ancora.getUTCMonth() + deslocamento;
	const ano = Math.floor(totalMeses / 12);
	const mes = totalMeses - ano * 12;
	const dia = Math.min(ancora.getUTCDate(), ultimoDiaDoMes(ano, mes));
	return new Date(
		Date.UTC(
			ano,
			mes,
			dia,
			ancora.getUTCHours(),
			ancora.getUTCMinutes(),
			ancora.getUTCSeconds(),
			ancora.getUTCMilliseconds()
		)
	);
}

/** O início do ciclo em que `agora` cai. Antes da âncora, o primeiro ciclo é o da própria âncora. */
export function inicioDoCiclo(ancora: Date, agora: Date): Date {
	if (agora <= ancora) return new Date(ancora);
	let meses =
		(agora.getUTCFullYear() - ancora.getUTCFullYear()) * 12 +
		(agora.getUTCMonth() - ancora.getUTCMonth());
	let inicio = mesDaAncora(ancora, meses);
	if (inicio > agora) {
		meses -= 1;
		inicio = mesDaAncora(ancora, meses);
	}
	return inicio;
}

/** Quando o saldo volta à franquia: o começo do ciclo seguinte. */
export function proximoCiclo(ancora: Date, agora: Date): Date {
	const inicio = inicioDoCiclo(ancora, agora);
	const meses =
		(inicio.getUTCFullYear() - ancora.getUTCFullYear()) * 12 +
		(inicio.getUTCMonth() - ancora.getUTCMonth());
	return mesDaAncora(ancora, meses + 1);
}
