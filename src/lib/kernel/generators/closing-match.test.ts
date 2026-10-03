import { describe, expect, it } from 'vitest';
import { runGenerators, type StoredContentUnit } from './index';
import { selectItems } from './select';
import { ptBR } from '../language/profiles/pt-BR';
import { enUS } from '../language/profiles/en-US';
import { matchAuthoringSchema } from '../interactions/match';

/**
 * O exercício de associação que fecha a atividade — o único gerador que olha
 * o LOTE inteiro em vez de uma unidade de conteúdo.
 */

const options = {
	targetProfile: enUS,
	sourceProfile: ptBR,
	seed: 'atividade-1',
	capabilities: { asr: false, tts: false }
};

const TODAS = ['listening', 'speaking', 'reading', 'writing'] as const;

function frases(quantas: number): StoredContentUnit[] {
	return Array.from({ length: quantas }, (_, i) => ({
		id: `p${i}`,
		kind: 'SentencePair' as const,
		data: { target: `Sentence number ${i}.`, source: `Frase número ${i}.` }
	}));
}

function termos(quantos: number): StoredContentUnit[] {
	return Array.from({ length: quantos }, (_, i) => ({
		id: `t${i}`,
		kind: 'VocabItem' as const,
		data: { term: `word${i}`, translation: `palavra${i}` }
	}));
}

function vocabulario(termos: [string, string][]): StoredContentUnit[] {
	return termos.map(([term, translation], i) => ({
		id: `v${i}`,
		kind: 'VocabItem' as const,
		data: { term, translation }
	}));
}

describe('closing-match', () => {
	it('fecha a atividade com um item de associação', () => {
		const { closing } = runGenerators(termos(4), options);
		expect(closing?.interaction.type).toBe('match');
		// O payload precisa valer para o registry, senão rebentaria em
		// `toRuntime()` — ou seja, na tela do aluno.
		expect(matchAuthoringSchema.safeParse(closing?.interaction.payload).success).toBe(true);
	});

	// É uma REVISÃO: sem material que apareceu antes, não há o que revisar.
	it('não inventa item quando há material demais de menos', () => {
		expect(runGenerators(termos(1), options).closing).toBeNull();
		expect(runGenerators([], options).closing).toBeNull();
	});

	// Associação é exercício de PALAVRA. Ligar frases inteiras é outra coisa, e
	// mais fraca — o aluno casa pelo tamanho do cartão antes de ler. E recortar
	// palavras de dentro das frases exigiria alinhamento, que é conhecimento de
	// língua: o kernel não tem e não pode ter.
	it('NÃO monta o fecho a partir de frases — só de vocabulário', () => {
		expect(runGenerators(frases(6), options).closing).toBeNull();
	});

	it('usa só o vocabulário quando as frases estão junto', () => {
		const { closing } = runGenerators(
			[
				...frases(3),
				...vocabulario([
					['bookshop', 'livraria'],
					['manager', 'gerente']
				])
			],
			options
		);
		const payload = matchAuthoringSchema.parse(closing?.interaction.payload);
		expect(payload.pairs.map((p) => p.left).sort()).toEqual(['bookshop', 'manager']);
	});

	// Com dois "livro" à direita, dois pares ficam igualmente certos e o aluno
	// perde ponto por acertar.
	it('descarta par repetido', () => {
		const { closing } = runGenerators(
			vocabulario([
				['book', 'livro'],
				['notebook', 'livro'],
				['pen', 'caneta']
			]),
			options
		);
		const payload = matchAuthoringSchema.parse(closing?.interaction.payload);
		const direita = payload.pairs.map((p) => p.right);
		expect(new Set(direita).size).toBe(direita.length);
	});

	// `match` é duas colunas num celular: acima de cinco pares o aluno rola
	// para achar o par e o exercício vira caça ao tesouro.
	it('não passa de cinco pares', () => {
		const { closing } = runGenerators(termos(12), options);
		const payload = matchAuthoringSchema.parse(closing?.interaction.payload);
		expect(payload.pairs.length).toBeLessThanOrEqual(5);
	});

	it('é determinístico — mesma atividade, mesmos pares', () => {
		const a = runGenerators(termos(9), options).closing;
		const b = runGenerators(termos(9), options).closing;
		expect(a).toEqual(b);
	});

	it('entra por ÚLTIMO e reserva a própria vaga', () => {
		const { groups, closing } = runGenerators([...frases(4), ...termos(4)], options);
		const escolhidos = selectItems(groups, { target: 5, skills: [...TODAS] }, closing);

		expect(escolhidos).toHaveLength(5);
		expect(escolhidos.at(-1)?.generatedBy).toBe('closing-match');
		// Uma vaga só: o fecho não pode aparecer duas vezes nem empurrar o alvo.
		expect(escolhidos.filter((i) => i.generatedBy === 'closing-match')).toHaveLength(1);
	});

	// O professor que desmarcou leitura não quer um exercício de leitura no fim.
	it('respeita o filtro de habilidades', () => {
		const { groups, closing } = runGenerators([...frases(4), ...termos(4)], options);
		const escolhidos = selectItems(groups, { target: 5, skills: ['writing'] }, closing);
		expect(escolhidos.some((i) => i.generatedBy === 'closing-match')).toBe(false);
	});
});
