import { describe, expect, it } from 'vitest';
import { parseRawMaterial, previewRawLines } from './parse-raw';
import { parseContentUnit } from './parse';

describe('parseRawMaterial', () => {
	it('lê uma frase por linha no formato que a tela mostra', () => {
		const raw = [
			'She has been working here since 2019. · Ela trabalha aqui desde 2019.',
			'I have already finished the report. · Eu já terminei o relatório.'
		].join('\n');

		const units = parseRawMaterial('SentencePair', raw);

		expect(units).toHaveLength(2);
		expect(parseContentUnit('SentencePair', units[0])).toEqual({
			target: 'She has been working here since 2019.',
			source: 'Ela trabalha aqui desde 2019.'
		});
	});

	it('ignora a linha que não tem o separador em vez de gravar material quebrado', () => {
		const raw = ['bom · good', 'linha sem separador'].join('\n');
		expect(parseRawMaterial('SentencePair', raw)).toHaveLength(1);
	});

	it('trata o bloco inteiro como um texto só', () => {
		const raw = 'A day in Lisbon\nThe tram climbs the hill.\nTourists take photos.';
		const [unit] = parseRawMaterial('Passage', raw);

		expect(parseContentUnit('Passage', unit)).toEqual({
			title: 'A day in Lisbon',
			text: 'The tram climbs the hill.\nTourists take photos.',
			questions: []
		});
	});

	it('lê "Falante: fala" no diálogo e alterna quando o professor não marca', () => {
		const comFalante = parseRawMaterial('Dialogue', 'Ana: Bom dia.\nJoão: Bom dia!');
		expect(parseContentUnit('Dialogue', comFalante[0]).lines[0]).toEqual({
			speaker: 'Ana',
			text: 'Bom dia.'
		});

		const semFalante = parseRawMaterial('Dialogue', 'Bom dia.\nBom dia!');
		expect(parseContentUnit('Dialogue', semFalante[0]).lines.map((l) => l.speaker)).toEqual([
			'A',
			'B'
		]);
	});

	it('não cria diálogo de uma fala só', () => {
		expect(parseRawMaterial('Dialogue', 'Bom dia.')).toEqual([]);
	});
});

describe('previewRawLines', () => {
	it('mostra cada linha com o que virou esquerda e direita, e marca a que não tem separador', () => {
		const raw = ['breakfast · café da manhã', 'afternoon', 'lunch | almoço'].join('\n');

		expect(previewRawLines(raw)).toEqual([
			{ text: 'breakfast · café da manhã', left: 'breakfast', right: 'café da manhã', ok: true },
			{ text: 'afternoon', left: 'afternoon', right: '', ok: false },
			{ text: 'lunch | almoço', left: 'lunch', right: 'almoço', ok: true }
		]);
	});

	it('concorda com o parser de verdade sobre quantas linhas viram material', () => {
		const raw = ['a · b', 'sem separador', 'c - d', '', 'e\tf'].join('\n');
		const ok = previewRawLines(raw).filter((l) => l.ok).length;
		expect(ok).toBe(parseRawMaterial('VocabItem', raw).length);
	});
});
