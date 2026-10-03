import type { InteractionKind, InteractionRuntime } from '$lib/kernel/interactions/types';

/**
 * A resposta do ALUNO em texto legível, para a tela de revisão.
 *
 * A entrada é o payload de `toRuntime()`, nunca o de autoria: em `assemble`,
 * `match` e `order` a resposta guardada é uma lista de ids atribuídos DEPOIS
 * do embaralhamento (kernel.md), então o único jeito de saber o que cada id
 * quer dizer é remontar exatamente o que o aluno viu. Ler o payload de
 * autoria aqui daria o mesmo texto e traria o gabarito junto — que é a regra
 * inviolável nº 1 pelo avesso.
 */

interface Opcao {
	id: string;
	text: string;
}

function porId(itens: Opcao[] | undefined): Map<string, string> {
	return new Map((itens ?? []).map((item) => [item.id, item.text]));
}

function comoTexto(valor: unknown): string {
	return typeof valor === 'string' ? valor : '';
}

function idsParaTexto(ids: unknown, mapa: Map<string, string>, separador: string): string {
	if (!Array.isArray(ids)) return '';
	return ids
		.map((id) => (typeof id === 'string' ? (mapa.get(id) ?? '') : ''))
		.filter(Boolean)
		.join(separador);
}

export function readableAnswer(
	kind: InteractionKind,
	runtime: InteractionRuntime,
	answer: unknown
): string {
	if (typeof answer !== 'object' || answer === null) return '';
	const resposta = answer as Record<string, unknown>;
	const r = runtime as unknown as Record<string, unknown>;

	switch (kind) {
		case 'type':
		case 'cloze':
			return comoTexto(resposta.text);

		case 'speak':
			// Sem provedor de ASR não existe transcrição — a tela mostra o
			// estado, não uma linha vazia fingindo resposta.
			return comoTexto(resposta.transcript);

		case 'choice':
			return porId(r.options as Opcao[]).get(comoTexto(resposta.optionId)) ?? '';

		case 'select':
			return porId(r.segments as Opcao[]).get(comoTexto(resposta.segmentId)) ?? '';

		case 'assemble':
			return idsParaTexto(resposta.sequence, porId(r.tokens as Opcao[]), ' ');

		case 'order':
			return idsParaTexto(resposta.sequence, porId(r.lines as Opcao[]), ' → ');

		case 'match': {
			const esquerda = porId(r.left as Opcao[]);
			const direita = porId(r.right as Opcao[]);
			const pares = Array.isArray(resposta.pairs) ? resposta.pairs : [];
			return pares
				.map((par) => {
					const { left, right } = (par ?? {}) as { left?: unknown; right?: unknown };
					const a = esquerda.get(comoTexto(left));
					const b = direita.get(comoTexto(right));
					return a && b ? `${a} → ${b}` : '';
				})
				.filter(Boolean)
				.join(' · ');
		}
	}
}
