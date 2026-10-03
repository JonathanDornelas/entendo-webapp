import { describe, expect, it } from 'vitest';
import { runGenerators } from '$lib/kernel/generators';
import { getInteraction } from '$lib/kernel/interactions/registry';
import { getProfile } from '$lib/kernel/language/profiles';
import { tecladoAlcanca } from '$lib/kernel/language/alcance';
import { tecladoDe } from '$lib/kernel/language/teclado';
import { gradingSchema, interactionSchema, type Item } from '$lib/kernel/item';
import { payloadParaCorrigir, transcritorPara } from './index';

/**
 * A leitura de verdade — kuromoji e pinyin-pro —, do começo ao fim: o gerador a
 * põe no gabarito, a questão de digitar existe, e a resposta escrita com o
 * teclado do idioma é CERTA. Uma leitura errada aqui reprova quem acertou, e é
 * por isso que os casos são frases de livro didático, com as armadilhas de
 * leitura que elas têm.
 */

const ja = getProfile('ja-JP');
const zh = getProfile('zh-CN');

async function ler(tag: 'ja-JP' | 'zh-CN', antes: string, alvo: string, depois = '') {
	const profile = getProfile(tag);
	const transcrever = await transcritorPara(profile);
	const entrada = profile.input;
	if (!transcrever || entrada.modo !== 'grade' || !entrada.transcricao) throw new Error('sem');
	return transcrever({ antes, alvo, depois }, entrada.transcricao);
}

describe('kana', () => {
	it.each([
		['明日友達に会います。', 'あしたともだちにあいます。'],
		['まだ宿題が終わっていません。', 'まだしゅくだいがおわっていません。'],
		['私は学生です。', 'わたしはがくせいです。'],
		// Palavra já em katakana fica em katakana — `コーヒー` não vira `こーひー`.
		['コーヒーを二杯ください。', 'コーヒーをにはいください。']
	])('%s → %s', async (frase, leitura) => {
		expect(await ler('ja-JP', '', frase)).toEqual([leitura]);
	});

	// A razão de a lacuna mandar a frase inteira: sozinho, `今日` poderia ser
	// `こんにち`; na frase, é `きょう`.
	it('lê a lacuna pela frase em volta', async () => {
		expect(await ler('ja-JP', '', '今日', 'は暑いです。')).toEqual(['きょう']);
	});

	// `会` de `会います` é metade da palavra `会い`: ler só ele seria inventar.
	it('lacuna que corta a palavra ao meio fica sem leitura', async () => {
		expect(await ler('ja-JP', '明日友達に', '会', 'います。')).toEqual([]);
	});
});

describe('pinyin', () => {
	it('junta as sílabas por palavra, e aceita também sílaba a sílaba', async () => {
		expect(await ler('zh-CN', '', '我们还没决定。')).toEqual([
			'wǒmen hái méi juédìng',
			'wǒ men hái méi jué dìng'
		]);
	});

	// Polifônico: `行` é háng em 银行 e xíng em 行走 — a frase decide.
	it('lê o polifônico pelo contexto', async () => {
		expect(await ler('zh-CN', '我去', '银行', '。')).toEqual(['yínháng', 'yín háng']);
	});
});

describe('do gerador à correção', () => {
	/** Os itens de digitar no idioma alvo, gerados COM o transcritor de verdade. */
	async function digitaveis(tag: 'ja-JP' | 'zh-CN', pares: { source: string; target: string }[]) {
		const profile = getProfile(tag);
		const { groups } = runGenerators(
			pares.map((data, i) => ({ id: `cnt_${i}`, kind: 'SentencePair' as const, data })),
			{
				targetProfile: profile,
				sourceProfile: getProfile('pt-BR'),
				seed: 'seed',
				capabilities: { asr: true, tts: true },
				transcrever: await transcritorPara(profile)
			}
		);
		return groups
			.flatMap((g) => g.items)
			.filter((item) => {
				const tipo = interactionSchema.parse(item.interaction).type;
				return (
					(tipo === 'type' || tipo === 'cloze') &&
					gradingSchema.parse(item.grading).answerLang !== 'source'
				);
			});
	}

	const aceitas = (item: Item) => (item.interaction.payload as { accepted: string[] }).accepted;

	it('japonês com kanji ganha "ouça e escreva", com a leitura no gabarito', async () => {
		const itens = await digitaveis('ja-JP', [
			{ source: 'Amanhã encontro um amigo.', target: '明日友達に会います。' },
			{ source: 'Ainda não terminei a lição.', target: 'まだ宿題が終わっていません。' },
			{ source: 'Eu sou estudante.', target: '私は学生です。' }
		]);
		const escuta = itens.filter((i) => i.generatedBy === 'listen-type');
		expect(escuta.length).toBeGreaterThan(0);
		for (const item of escuta) {
			// O kanji continua sendo o primeiro — é o que o aluno vê como esperado.
			expect(aceitas(item)[0]).toMatch(/\p{Script=Han}/u);
			expect(aceitas(item).some((r) => tecladoAlcanca(tecladoDe(ja.input)!, r, ja))).toBe(true);
		}
	});

	it('mandarim ganha "ouça e escreva", com o pinyin no gabarito', async () => {
		const itens = await digitaveis('zh-CN', [
			{ source: 'Eu sou estudante.', target: '我是学生。' },
			{ source: 'Ainda não decidimos.', target: '我们还没决定。' },
			{ source: 'Ela fala chinês.', target: '她说中文。' }
		]);
		const escuta = itens.filter((i) => i.generatedBy === 'listen-type');
		expect(escuta.length).toBeGreaterThan(0);
		// A divisão em palavras varia de livro para livro (o segmentador junta
		// `我是`); o espaço não pode custar nada — `strip-space` no zh-CN.
		const deEstudante = escuta.find((i) => aceitas(i)[0] === '我是学生。');
		expect(deEstudante).toBeDefined();
		for (const resposta of ['wǒ shì xuéshēng', 'wǒshì xuéshēng', 'wǒ shì xué shēng']) {
			const nota = getInteraction('type').grade(
				deEstudante!.interaction.payload,
				{ text: resposta },
				zh,
				's'
			);
			expect(nota.ok && nota.value.value).toBe(1);
		}
	});

	/**
	 * O que já está no ar: "ouça e escreva" gerado antes da transcrição, com o
	 * gabarito SÓ em kanji. O teclado de kana aparece nele — e a resposta em kana
	 * tem de ser certa na hora de corrigir, sem republicar.
	 */
	it('corrige como certa a resposta em kana de uma questão antiga, só em kanji', async () => {
		const interaction = { type: 'type' as const, payload: { accepted: ['明日友達に会います。'] } };
		const payload = await payloadParaCorrigir(interaction, {}, ja);
		const nota = getInteraction('type').grade(
			payload,
			{ text: 'あしたともだちにあいます' },
			ja,
			's'
		);
		expect(nota.ok && nota.value.value).toBe(1);
	});

	it('e a do pinyin, numa questão antiga de mandarim', async () => {
		const interaction = { type: 'type' as const, payload: { accepted: ['我们还没决定。'] } };
		const payload = await payloadParaCorrigir(interaction, {}, zh);
		const nota = getInteraction('type').grade(payload, { text: 'wǒmen hái méi juédìng' }, zh, 's');
		expect(nota.ok && nota.value.value).toBe(1);
	});
});
