import type { ContentUnitKind } from './types';

/**
 * O que um conjunto de materiais JÁ DÁ para gerar, contado antes de gerar.
 *
 * A etapa 2 do wizard e a biblioteca mostram isso embaixo do tipo escolhido —
 * é o aviso que faltava: distrator sai sempre do próprio conjunto (kernel.md
 * "Distratores"), então um termo sozinho não vira exercício de escolha, e o
 * professor só descobria na etapa 3, depois de gerar, com "nada gerado a
 * partir deste material".
 *
 * É uma ESTIMATIVA, não o resultado dos geradores: eles ainda dependem dos
 * profiles, de TTS/ASR e do corte de `selectItems`. O que se espelha aqui é o
 * piso de cada tipo — abaixo dele o gerador devolve zero, com certeza.
 */

/** O resumo de um material que a estimativa precisa — nada do conteúdo em si. */
export interface MaterialResumido {
	kind: ContentUnitKind;
	/** Quantas perguntas de compreensão um `Passage` tem; 0 nos outros tipos. */
	questions?: number;
}

/** Quantos exercícios um `SentencePair` rende sem áudio: montar, traduzir e completar. */
export const ITENS_POR_FRASE = 3;
/** Vocabulário e perguntas precisam de um segundo para tirar a alternativa errada. */
export const MINIMO_PARA_DISTRATOR = 2;

export interface Rendimento {
	frases: number;
	termos: number;
	textos: number;
	perguntas: number;
	dialogos: number;
	/** Quantos itens o conjunto rende, no mínimo, sem contar escuta e fala. */
	itens: number;
}

export function estimarRendimento(materiais: MaterialResumido[]): Rendimento {
	let frases = 0;
	let termos = 0;
	let textos = 0;
	let perguntas = 0;
	let dialogos = 0;

	for (const m of materiais) {
		switch (m.kind) {
			case 'SentencePair':
				frases++;
				break;
			case 'VocabItem':
				termos++;
				break;
			case 'Passage':
				textos++;
				perguntas += m.questions ?? 0;
				break;
			case 'Dialogue':
				dialogos++;
				break;
		}
	}

	// `vocab-choice` e `passage-comprehension` tiram a alternativa errada de
	// OUTRO termo / de OUTRA pergunta do conjunto; com um só, devolvem zero.
	// `order-lines` se resolve sozinho — o diálogo já traz as falas.
	const itens =
		frases * ITENS_POR_FRASE +
		(termos >= MINIMO_PARA_DISTRATOR ? termos : 0) +
		(perguntas >= MINIMO_PARA_DISTRATOR ? perguntas : 0) +
		dialogos;

	return { frases, termos, textos, perguntas, dialogos, itens };
}
