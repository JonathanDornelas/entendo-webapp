/**
 * Duração em texto, para o aluno. Isomórfico porque três telas mostram o mesmo
 * número — o resultado da tentativa, a área do aluno e o histórico do professor
 * — e um "10 min 22 s" escrito de duas formas em duas telas é o tipo de coisa
 * que faz o aluno achar que são dois números diferentes.
 *
 * **Segundos aparecem, e isso é deliberado.** Uma questão de escolha leva 20 s;
 * arredondar para "0 min" apagaria justamente a informação. Acima de um minuto
 * os segundos continuam, porque a comparação com a turma é fina.
 */
export function duracao(ms: number): string {
	// `Math.max(0, NaN)` é NaN, não 0 — sem esta linha um `ms` ausente virava
	// "NaN min NaN s" na tela do aluno.
	const total = Number.isFinite(ms) ? Math.max(0, Math.round(ms / 1000)) : 0;
	if (total < 60) return `${total} s`;

	const minutos = Math.floor(total / 60);
	const segundos = total % 60;
	// Sem segundos quando são zero: "3 min" lê melhor do que "3 min 00 s".
	if (segundos === 0) return `${minutos} min`;
	return `${minutos} min ${String(segundos).padStart(2, '0')} s`;
}

/**
 * Há quanto tempo. Aproximado de propósito: "há 3 dias" é o que o aluno quer
 * saber, e um horário exato daria a impressão de um registro de ponto.
 */
export function haQuantoTempo(data: Date, agora = new Date()): string {
	const minutos = Math.round((agora.getTime() - data.getTime()) / 60000);
	if (minutos < 60) return 'há minutos';

	const horas = Math.round(minutos / 60);
	if (horas < 24) return `há ${horas}h`;

	const dias = Math.round(horas / 24);
	if (dias === 1) return 'ontem';
	if (dias < 7) return `há ${dias} dias`;

	const semanas = Math.round(dias / 7);
	return semanas === 1 ? 'há 1 semana' : `há ${semanas} semanas`;
}

/** "14 de setembro" — a data de uma tentativa, sem ano nem hora. */
export function diaEMes(data: Date): string {
	return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

/** "2ª", "3ª" — o número da tentativa. */
export function ordinal(n: number): string {
	return `${n}ª`;
}
