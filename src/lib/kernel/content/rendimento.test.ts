import { describe, expect, it } from 'vitest';
import { estimarRendimento } from './rendimento';

describe('estimarRendimento', () => {
	it('conta três exercícios por frase, sem depender de áudio', () => {
		const r = estimarRendimento([{ kind: 'SentencePair' }, { kind: 'SentencePair' }]);
		expect(r.frases).toBe(2);
		expect(r.itens).toBe(6);
	});

	it('um termo sozinho não gera nada — a alternativa errada sai de outro termo', () => {
		expect(estimarRendimento([{ kind: 'VocabItem' }]).itens).toBe(0);
		expect(estimarRendimento([{ kind: 'VocabItem' }, { kind: 'VocabItem' }]).itens).toBe(2);
	});

	it('perguntas contam no conjunto inteiro, não por texto', () => {
		const umTextoUmaPergunta = estimarRendimento([{ kind: 'Passage', questions: 1 }]);
		expect(umTextoUmaPergunta.perguntas).toBe(1);
		expect(umTextoUmaPergunta.itens).toBe(0);

		const doisTextos = estimarRendimento([
			{ kind: 'Passage', questions: 1 },
			{ kind: 'Passage', questions: 1 }
		]);
		expect(doisTextos.textos).toBe(2);
		expect(doisTextos.itens).toBe(2);
	});

	it('diálogo se resolve sozinho: um exercício por diálogo', () => {
		expect(estimarRendimento([{ kind: 'Dialogue' }]).itens).toBe(1);
	});
});
