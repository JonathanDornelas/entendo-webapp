import type { ContentUnitKind } from '$lib/kernel/content/types';

/**
 * O vocabulário que a biblioteca e a etapa 2 do wizard compartilham: os
 * quatro tipos de material COMO A TELA OS CHAMA, e a forma da linha que as
 * duas listas mostram. Mora fora do `.svelte` porque dois loaders e duas
 * páginas montam a mesma linha — e um tipo declarado duas vezes diverge no
 * primeiro campo novo.
 */

export type MaterialKind = 'pair' | 'vocab' | 'text' | 'dialogue';

export interface Pergunta {
	question: string;
	answer: string;
}
export interface Fala {
	speaker: string;
	text: string;
}

/**
 * Uma linha de material, como as duas listas a mostram. `primary` e
 * `secondary` são o RESUMO (o texto vem cortado, o diálogo vira contagem);
 * os campos crus embaixo existem para "Editar" reabrir o formulário
 * preenchido campo a campo, sem perder conteúdo.
 */
export interface MaterialRow {
	id: string;
	kind: MaterialKind;
	primary: string;
	secondary: string;
	/** Em quantas atividades ele está. */
	usedIn: number;
	/** A tag de idioma do material (`$lib/idiomas.ts`); nula = sem idioma. */
	idioma?: string | null;
	/** Wizard: está em mais de uma atividade, ou seja, veio da biblioteca. */
	daBiblioteca?: boolean;
	target: string;
	source: string;
	raw: string;
	note: string;
	example: string;
	questions: Pergunta[];
	lines: Fala[];
}

export const KIND_TO_KERNEL: Record<MaterialKind, ContentUnitKind> = {
	pair: 'SentencePair',
	vocab: 'VocabItem',
	text: 'Passage',
	dialogue: 'Dialogue'
};
export const KERNEL_TO_KIND: Record<ContentUnitKind, MaterialKind> = {
	SentencePair: 'pair',
	VocabItem: 'vocab',
	Passage: 'text',
	Dialogue: 'dialogue'
};

export interface TipoDeMaterial {
	id: MaterialKind;
	label: string;
	/** O que o ALUNO faz com ele — é por isso que o professor escolhe, não pelo formato. */
	does: string;
	/** A explicação de um parágrafo, no `title` do cartão. */
	title: string;
	/** Traço do ícone, na grade de 24px (design-system.md "Ícones"). */
	icon: string;
	/** A cor da pílula na lista. */
	tone: 'primary' | 'accent' | 'soft';
}

/**
 * Os quatro tipos aparecem PELO EXERCÍCIO que produzem, não pelo formato do
 * dado — a dúvida do professor é "o que eu quero que o aluno faça".
 */
export const TIPOS: readonly TipoDeMaterial[] = [
	{
		id: 'pair',
		label: 'Par de frases',
		does: 'montar, traduzir, completar, ouvir e falar',
		title:
			'Uma frase no idioma alvo com a tradução. Rende três exercícios sem áudio — e mais quatro com escuta e fala.',
		icon: 'M4 8.5h11M4 8.5l3-3M4 8.5l3 3M20 15.5H9M20 15.5l-3-3M20 15.5l-3 3',
		tone: 'primary'
	},
	{
		id: 'vocab',
		label: 'Vocabulário',
		does: 'escolher a tradução e associar os pares',
		title: 'Termo e sentido. A alternativa errada sai de outro termo seu.',
		icon: 'M4 6.5h7v11H4zM13 6.5h7v11h-7z',
		tone: 'accent'
	},
	{
		id: 'text',
		label: 'Texto',
		does: 'responder sobre o que leu',
		title: 'Texto corrido com perguntas de compreensão. Sem pergunta, nada é gerado.',
		icon: 'M5 5.5h14M5 10h14M5 14.5h9M5 19h6',
		tone: 'soft'
	},
	{
		id: 'dialogue',
		label: 'Diálogo',
		does: 'colocar as falas na ordem',
		title: 'Falas em sequência, no mínimo duas. Vira um exercício de ordenar.',
		icon: 'M3.5 6.5a2 2 0 012-2h9a2 2 0 012 2v4a2 2 0 01-2 2h-6l-4 3zM18.5 10.5h1a2 2 0 012 2v4a2 2 0 01-2 2h-1l-3 2.5V19h-3',
		tone: 'soft'
	}
];

export const tipoDe = (kind: MaterialKind): TipoDeMaterial =>
	TIPOS.find((t) => t.id === kind) ?? TIPOS[0];

/** Classes da pílula de tipo, inteiras e literais — Tailwind só gera o que lê no fonte. */
export const PILL_TONE: Record<TipoDeMaterial['tone'], string> = {
	primary: 'bg-base-300 text-primary',
	accent: 'bg-accent/12 text-accent',
	soft: 'border border-line bg-base-200 text-base-content/70'
};

export const FALAS_INICIAIS: readonly Fala[] = [
	{ speaker: 'A', text: '' },
	{ speaker: 'B', text: '' }
];
