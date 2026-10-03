import { z } from 'zod';
import type { InteractionKind } from '../interactions/types';
import type { Item } from '../item';
import { tecladoAlcanca } from './alcance';
import { normalize } from './normalize';
import type { LanguageProfile } from './profile';
import type { Transcricao } from './teclado';

/**
 * A resposta no idioma alvo, escrita COM O TECLADO do idioma.
 *
 * O gabarito de japonês vem em kanji (`明日友達に会います`) e o teclado de kana
 * não o escreve; o de chinês vem em hanzi e o teclado de pinyin também não. Sem
 * isto, ou o aluno leva zero por escrever `あしたともだちにあいます` — que é a
 * resposta certa, na única escrita que ele tem —, ou a questão nem existe.
 *
 * O que fecha a conta é o gabarito ganhar a LEITURA da frase como resposta
 * aceita. Ela sai de um `Transcritor`, que é do SERVIDOR (dicionário, 18 MB de
 * japonês); o kernel só diz quando pedir e o que fazer com o resultado. O
 * profile declara qual transcrição vale (`EntradaDoIdioma.transcricao`), e é
 * por isso que nada aqui sabe que idioma é.
 */

/**
 * O pedaço que o aluno escreve, com o resto da frase em volta. O contexto não é
 * enfeite: `会` sozinho se lê `kai`, e em `会います` se lê `a`. Numa lacuna, o
 * transcritor lê a frase inteira e devolve só o trecho do alvo.
 */
export interface TrechoDaFrase {
	antes: string;
	alvo: string;
	depois: string;
}

/**
 * Outras grafias do alvo — as que o teclado escreve. Vazio quando não sabe
 * transcrever (palavra fora do dicionário, lacuna que corta uma palavra ao
 * meio): aí a questão não ganha leitura, e o gerador a corta como antes.
 */
export type Transcritor = (trecho: TrechoDaFrase, transcricao: Transcricao) => string[];

/** `type` e `cloze` guardam o gabarito no mesmo campo; `cloze` tem a máscara. */
const payloadDeEscrita = z.looseObject({
	accepted: z.array(z.string()),
	masked: z.string().optional()
});

/**
 * O payload de uma questão de digitar, com a leitura acrescentada às respostas
 * aceitas quando NENHUMA delas cabe no teclado do idioma. Devolve o mesmo
 * payload (a mesma referência) quando não há o que fazer:
 *
 * - a resposta não é no idioma alvo (em `translate-type` o aparelho é do aluno);
 * - o idioma não tem teclado de grade, ou não declara transcrição;
 * - alguma resposta aceita já cabe no teclado — inclusive a leitura que o
 *   professor deixou (ou corrigiu) no editor: ela VENCE, e nada é recalculado.
 *
 * A leitura entra DEPOIS do gabarito original, que continua sendo o primeiro —
 * é ele que o aluno vê como "a resposta esperada".
 */
export function comLeituraAceita(
	interaction: { type: InteractionKind; payload: unknown },
	grading: Pick<Item['grading'], 'answerLang'>,
	profile: LanguageProfile,
	transcrever: Transcritor | undefined
): unknown {
	const { payload } = interaction;
	if (interaction.type !== 'type' && interaction.type !== 'cloze') return payload;
	if ((grading.answerLang ?? 'target') !== 'target') return payload;

	const entrada = profile.input;
	if (entrada.modo !== 'grade' || !entrada.transcricao || !transcrever) return payload;

	const lido = payloadDeEscrita.safeParse(payload);
	if (!lido.success) return payload;
	const { accepted, masked } = lido.data;
	if (accepted.some((r) => tecladoAlcanca(entrada.teclado, r, profile))) return payload;

	const moldura = molduraDaResposta(interaction.type, masked);
	if (!moldura) return payload;

	const jaAceitas = new Set(accepted.map((r) => normalize(r, profile)));
	const leituras: string[] = [];
	for (const alvo of accepted) {
		for (const leitura of transcrever({ ...moldura, alvo }, entrada.transcricao)) {
			const chave = normalize(leitura, profile);
			if (!chave || jaAceitas.has(chave)) continue;
			if (!tecladoAlcanca(entrada.teclado, leitura, profile)) continue;
			jaAceitas.add(chave);
			leituras.push(leitura);
		}
	}
	if (leituras.length === 0) return payload;
	return { ...lido.data, accepted: [...accepted, ...leituras] };
}

/**
 * Onde a resposta mora na frase. Em `type` ela É a frase. Em `cloze`, é a
 * lacuna — e só com UMA lacuna: com duas, a resposta junta as duas e não há
 * como saber onde cortar a leitura.
 */
function molduraDaResposta(
	tipo: InteractionKind,
	masked: string | undefined
): { antes: string; depois: string } | null {
	if (tipo === 'type') return { antes: '', depois: '' };
	if (!masked) return null;
	const lacunas = [...masked.matchAll(/_{2,}/g)];
	if (lacunas.length !== 1) return null;
	const lacuna = lacunas[0]!;
	return {
		antes: masked.slice(0, lacuna.index),
		depois: masked.slice(lacuna.index + lacuna[0].length)
	};
}
