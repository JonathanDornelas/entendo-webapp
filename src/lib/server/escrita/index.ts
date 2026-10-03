import { comLeituraAceita } from '$lib/kernel/language/escrita';
import type { LanguageProfile } from '$lib/kernel/language/profile';
import type { Item } from '$lib/kernel/item';
import { transcritorPara } from './transcritor';

export { transcritorPara } from './transcritor';

/**
 * O payload com que uma resposta é CORRIGIDA: o gravado, mais a leitura da
 * frase quando nenhuma resposta aceita cabe no teclado do idioma
 * (`kernel/language/escrita.ts`).
 *
 * **É isto que conserta o que já está no ar.** Uma atividade de japonês gerada
 * antes da transcrição tem "ouça e escreva" com o gabarito só em kanji — e o
 * teclado de kana aparece nela, porque o teclado sai do profile na hora de
 * montar a questão. Sem a leitura aqui, quem escrevesse a resposta certa em
 * kana levaria zero. A versão publicada continua intacta (regra nº 7): nada é
 * gravado, a leitura é calculada a cada correção.
 *
 * Item gerado DEPOIS já traz a leitura no gabarito — e aí ela ganha: se o
 * professor corrigiu a leitura no editor, a dele é que vale, porque alguma
 * resposta aceita já cabe no teclado e nada é recalculado.
 */
export async function payloadParaCorrigir(
	interaction: { type: Item['interaction']['type']; payload: unknown },
	grading: Pick<Item['grading'], 'answerLang'>,
	profile: LanguageProfile
): Promise<unknown> {
	// Só questão de digitar no idioma alvo pode precisar de leitura — as outras
	// nem carregam o dicionário.
	if (interaction.type !== 'type' && interaction.type !== 'cloze') return interaction.payload;
	if ((grading.answerLang ?? 'target') !== 'target') return interaction.payload;
	return comLeituraAceita(interaction, grading, profile, await transcritorPara(profile));
}
