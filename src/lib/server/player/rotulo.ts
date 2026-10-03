import { tipoDoItem } from '$lib/server/atividades/resumo';
import type { GradingMode, InteractionKind, Prompt } from '$lib/kernel/interactions/types';

/**
 * O que o ALUNO fez naquela questão, em duas ou três palavras: "escuta",
 * "montar frase", "escrita longa".
 *
 * Existe porque as telas do aluno mostravam a chave técnica — o rótulo era
 * `` `${interaction.type} · ${itemSkills(item).join(' + ')}` ``, que chega na
 * tela como "cloze · writing". Isso quebra duas regras ao mesmo tempo: a tela
 * nunca mostra a chave técnica (`skillLabels` existe justamente para isso), e
 * o aluno não faz ideia do que é um `cloze`.
 *
 * Parte do `tipoDoItem` do Studio — as duas telas têm que chamar a mesma
 * questão pela mesma coisa — e acrescenta o que só importa para quem
 * respondeu: em escrita, QUAL escrita, porque "tolerante" e "longa" mudam o que
 * ele pode esperar do resultado (uma perdoa acento, a outra espera o professor).
 */
export function rotuloDoItem(
	prompt: Prompt,
	interaction: InteractionKind,
	grading: GradingMode
): string {
	const tipo = tipoDoItem(prompt.kind, interaction);

	if (tipo === 'montar') return 'montar frase';
	if (tipo !== 'escrita') return tipo;

	// Escrita tem três caras, e a diferença é o que o aluno precisa saber.
	if (grading === 'rubric') return 'escrita longa';
	if (grading === 'tolerant') return 'escrita tolerante';
	return 'escrita';
}
