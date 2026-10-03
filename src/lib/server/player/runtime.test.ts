import { describe, expect, it } from 'vitest';
import { runGenerators, type GenerationOptions } from '$lib/kernel/generators';
import { buildRuntimeItem, type StoredItemRow } from './runtime';
import { ptBR } from '$lib/kernel/language/profiles/pt-BR';
import { enUS } from '$lib/kernel/language/profiles/en-US';
import { arSA } from '$lib/kernel/language/profiles/ar-SA';
import type { LanguageProfile } from '$lib/kernel/language/profile';

/**
 * Regra inviolável nº 1 no ponto exato onde ela quebra: o item passa pelo
 * gerador, é gravado como JSON e volta montado para o browser. Se um campo
 * de gabarito sobreviver a esse caminho, ele chega no aluno.
 */
const options: GenerationOptions = {
	targetProfile: enUS,
	sourceProfile: ptBR,
	seed: 'seed-de-geracao',
	capabilities: { asr: true, tts: true }
};

const materiais = [
	{
		id: 'cnt_1',
		kind: 'SentencePair' as const,
		data: { source: 'Ela trabalha aqui desde 2019.', target: 'She has worked here since 2019.' }
	},
	{
		id: 'cnt_2',
		kind: 'SentencePair' as const,
		data: { source: 'Eu já terminei o relatório.', target: 'I have already finished the report.' }
	}
];

function rows(): StoredItemRow[] {
	// `structuredClone` simula a ida e volta pelo Json do Postgres.
	return runGenerators(materiais, options)
		.groups.flatMap((g) => g.items)
		.map((item) => structuredClone({ ...item, id: `row_${item.id}` }) as StoredItemRow);
}

describe('buildRuntimeItem', () => {
	it('nunca entrega o texto que o áudio diz', () => {
		for (const row of rows()) {
			const runtime = buildRuntimeItem(row, 'seed-tentativa', new Map());
			const serialized = JSON.stringify(runtime);

			// A frase alvo só pode aparecer quando o aluno tem direito de vê-la
			// (nunca num item de escuta).
			if (runtime.interaction === 'type' && !runtime.passage) {
				expect(serialized).not.toContain('She has worked here since 2019.');
			}
		}
	});

	it('nunca entrega os campos de gabarito de nenhuma interação', () => {
		for (const row of rows()) {
			const serialized = JSON.stringify(buildRuntimeItem(row, 'seed-tentativa', new Map()));
			expect(serialized).not.toContain('accepted');
			expect(serialized).not.toContain('correctIndex');
			expect(serialized).not.toContain('distractors');
			expect(serialized).not.toContain('hints');
		}
	});

	it('item de escuta não manda o texto sintetizado nem como enunciado', () => {
		const listening = rows().filter((row) => {
			const prompt = row.prompt as { kind: string };
			return prompt.kind === 'audio';
		});
		expect(listening.length).toBeGreaterThan(0);

		for (const row of listening) {
			const runtime = buildRuntimeItem(row, 'seed-tentativa', new Map());
			expect(runtime.passage).toBeUndefined();
			// mas o enunciado existe, senão a tela fica muda
			expect(runtime.prompt.length).toBeGreaterThan(0);

			if (runtime.interaction === 'choice') {
				// Numa escuta com alternativas a frase certa PRECISA aparecer —
				// é uma das opções. O que não pode é dar para saber qual é.
				const options = runtime.options as { text: string }[];
				expect(options.length).toBeGreaterThan(1);
				expect(JSON.stringify(runtime)).not.toContain('correctIndex');
			} else {
				expect(JSON.stringify(runtime)).not.toContain('She has worked here since 2019.');
			}
		}
	});

	it('é determinístico: a mesma tentativa vê sempre a mesma ordem', () => {
		for (const row of rows()) {
			const a = buildRuntimeItem(row, 'seed-tentativa', new Map());
			const b = buildRuntimeItem(row, 'seed-tentativa', new Map());
			expect(a).toEqual(b);
		}
	});
});

/**
 * O teclado virtual chega pelo mesmo portão do resto do item. Ele não é
 * gabarito — é o alfabeto do idioma —, mas tem de aparecer SÓ onde serve: numa
 * questão de digitar cuja resposta é no idioma alvo. Na língua do aluno
 * (`translate-type`) o aparelho é dele; num item de montar, tocar ou falar não
 * há o que digitar.
 */
describe('teclado virtual no item', () => {
	function rowsDe(alvo: LanguageProfile, pares: { source: string; target: string }[]) {
		return runGenerators(
			pares.map((data, i) => ({ id: `cnt_${i}`, kind: 'SentencePair' as const, data })),
			{ ...options, targetProfile: alvo }
		)
			.groups.flatMap((g) => g.items)
			.map(
				(item) =>
					structuredClone({ ...item, id: `row_${item.id}` }) as StoredItemRow & {
						generatedBy: string | null;
					}
			);
	}

	const arabe = rowsDe(arSA, [
		{ source: 'Eu sou estudante.', target: 'أنا طالب في المدرسة' },
		{ source: 'Este é um livro.', target: 'هذا كتاب جميل جدا' },
		{ source: 'Ela fala árabe.', target: 'هي تتحدث العربية الآن' }
	]);

	it('vai na questão de digitar no idioma alvo', () => {
		const digitaNoAlvo = arabe.filter((row) => {
			const r = buildRuntimeItem(row, 's', new Map());
			return (
				(r.interaction === 'type' || r.interaction === 'cloze') &&
				row.generatedBy !== 'translate-type'
			);
		});
		expect(digitaNoAlvo.length).toBeGreaterThan(0);
		for (const row of digitaNoAlvo) {
			expect(buildRuntimeItem(row, 's', new Map()).teclado?.id).toBe('arabe');
		}
	});

	it('não vai na tradução para a língua do aluno', () => {
		const traducao = arabe.filter((row) => row.generatedBy === 'translate-type');
		expect(traducao.length).toBeGreaterThan(0);
		for (const row of traducao) {
			expect(buildRuntimeItem(row, 's', new Map()).teclado).toBeUndefined();
		}
	});

	it('não vai em questão em que não se digita', () => {
		const semDigitar = arabe.filter((row) => {
			const tipo = (row.interaction as { type: string }).type;
			return tipo !== 'type' && tipo !== 'cloze';
		});
		expect(semDigitar.length).toBeGreaterThan(0);
		for (const row of semDigitar) {
			expect(buildRuntimeItem(row, 's', new Map()).teclado).toBeUndefined();
		}
	});

	it('não vai em idioma que o aparelho já escreve', () => {
		for (const row of rows()) {
			expect(buildRuntimeItem(row, 's', new Map()).teclado).toBeUndefined();
		}
	});
});
