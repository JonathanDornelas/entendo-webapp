import { describe, expect, it } from 'vitest';
import { runGenerators, type GenerationOptions, type StoredContentUnit } from './index';
import { selectItems } from './select';
import { getInteraction } from '../interactions/registry';
import { getProfile } from '../language/profiles';
import { vozDoTexto } from '../language/voice';
import { tokenize } from '../language/tokenize';
import { gradingSchema, interactionSchema, promptSchema, type Item } from '../item';
import type { LanguageProfile } from '../language/profile';

/**
 * Uma atividade INTEIRA, gerada em cada idioma que o Kokoro fala — e as
 * perguntas que decidem se ela é verdadeira:
 *
 * 1. **O gabarito não atravessa `toRuntime`** (regra inviolável nº 1). Os testes
 *    por interação já provam isso com payload montado à mão; aqui o payload é o
 *    que o GERADOR produziu, em nove escritas diferentes — que é o caminho real.
 * 2. **A correção acerta em cada língua.** A resposta certa vale 1 e a errada
 *    não; o normalizador daquele idioma está no meio do caminho.
 * 3. **Escuta existe só onde existe voz**, e a voz escolhida é uma do profile.
 * 4. **A tokenização respeita a escrita** — regra nº 5: em japonês e chinês os
 *    tokens de "montar a frase" não podem ser a frase inteira.
 * 5. **É determinístico** (regra nº 8): a mesma seed produz a mesma atividade.
 *
 * O árabe entra de propósito, e é o caso de controle: sem voz, a atividade tem
 * de sair completa e SEM nenhum item de escuta, em vez de travar.
 */

interface Caso {
	tag: string;
	/** Frases do idioma ALVO, com a tradução na língua do aluno. */
	pares: { source: string; target: string }[];
	/** Uma resposta ERRADA plausível, na escrita do idioma. */
	erradaNoAlvo: string;
}

const CASOS: Caso[] = [
	{
		tag: 'en-US',
		pares: [
			{ source: 'Ela trabalha aqui desde 2019.', target: 'She has worked here since 2019.' },
			{ source: 'Eu já terminei o relatório.', target: 'I have already finished the report.' },
			{ source: 'Nós moramos em Lisboa.', target: 'We live in Lisbon.' }
		],
		erradaNoAlvo: 'Nothing to do with the sentence'
	},
	{
		tag: 'en-GB',
		pares: [
			{ source: 'Ela mora em Londres.', target: 'She lives in London.' },
			{ source: 'Eu peguei o ônibus.', target: 'I took the bus.' },
			{ source: 'Nós gostamos de chá.', target: 'We like tea.' }
		],
		erradaNoAlvo: 'Completely unrelated words here'
	},
	{
		tag: 'es-ES',
		pares: [
			{ source: 'Eu moro em Madri.', target: 'Vivo en Madrid.' },
			{ source: 'Ela fala espanhol.', target: 'Ella habla español.' },
			{ source: 'Nós comemos às duas.', target: 'Comemos a las dos.' }
		],
		erradaNoAlvo: 'Nada que ver con la frase'
	},
	{
		tag: 'fr-FR',
		pares: [
			{ source: 'Eu moro em Paris.', target: "J'habite à Paris." },
			{ source: 'Ela fala francês.', target: 'Elle parle français.' },
			{ source: 'Nós temos dois filhos.', target: 'Nous avons deux enfants.' }
		],
		erradaNoAlvo: 'Rien à voir avec la phrase'
	},
	{
		tag: 'it-IT',
		pares: [
			{ source: 'Eu moro em Roma.', target: 'Abito a Roma.' },
			{ source: 'Ela fala italiano.', target: 'Lei parla italiano.' },
			{ source: 'Nós temos três gatos.', target: 'Abbiamo tre gatti.' }
		],
		erradaNoAlvo: 'Niente a che vedere con la frase'
	},
	{
		tag: 'hi-IN',
		pares: [
			{ source: 'Eu sou estudante.', target: 'मैं छात्र हूँ।' },
			{ source: 'Este é um livro.', target: 'यह एक किताब है।' },
			{ source: 'Ela fala híndi.', target: 'वह हिन्दी बोलती है।' }
		],
		erradaNoAlvo: 'कुछ और वाक्य'
	},
	{
		tag: 'zh-CN',
		pares: [
			{ source: 'Eu sou estudante.', target: '我是学生。' },
			{ source: 'Este é um livro.', target: '这是一本书。' },
			{ source: 'Ela fala chinês.', target: '她说中文。' }
		],
		erradaNoAlvo: '完全不同的句子'
		// Sem espaço nenhum na frase: é o caso que `split(' ')` quebraria.
	},
	{
		tag: 'ja-JP',
		pares: [
			{ source: 'Eu sou estudante.', target: '私は学生です。' },
			{ source: 'Este é um livro.', target: 'これは本です。' },
			{ source: 'Ela fala japonês.', target: '彼女は日本語を話します。' }
		],
		erradaNoAlvo: '全然違う文です'
	},
	{
		tag: 'ar-SA',
		pares: [
			{ source: 'Eu sou estudante.', target: 'أنا طالب.' },
			{ source: 'Este é um livro.', target: 'هذا كتاب.' },
			{ source: 'Ela fala árabe.', target: 'هي تتحدث العربية.' }
		],
		erradaNoAlvo: 'لا علاقة له بالجملة'
	}
];

const SEED = 'seed-da-atividade';

function materiais(caso: Caso): StoredContentUnit[] {
	return caso.pares.map((par, i) => ({
		id: `cnt_${i + 1}`,
		kind: 'SentencePair' as const,
		data: par
	}));
}

function opcoes(profile: LanguageProfile, tts: boolean): GenerationOptions {
	return {
		targetProfile: profile,
		// O aluno é falante de português em todos os casos — inclusive no caso do
		// próprio português, onde o par não faria sentido e por isso ele não está
		// na lista de alvos.
		sourceProfile: getProfile('pt-BR'),
		seed: SEED,
		capabilities: { asr: true, tts }
	};
}

function itensDe(caso: Caso, tts = true): Item[] {
	const profile = getProfile(caso.tag);
	const { groups, closing } = runGenerators(materiais(caso), opcoes(profile, tts));
	return selectItems(
		groups,
		{ target: 12, skills: ['listening', 'speaking', 'reading', 'writing'] },
		closing
	);
}

/** Todo texto que o gabarito daquele item contém, para procurar num payload. */
function textosDoGabarito(item: Item): string[] {
	const interaction = interactionSchema.parse(item.interaction);
	const payload = interaction.payload as Record<string, unknown>;
	const achados: string[] = [];

	const cavar = (valor: unknown) => {
		if (typeof valor === 'string') achados.push(valor);
		else if (Array.isArray(valor)) valor.forEach(cavar);
	};
	// `accepted` é a forma direta; `tokens` em ordem de autoria é gabarito também
	// (a ordem certa da frase), e `pairs` é o pareamento do `match`.
	for (const chave of ['accepted', 'tokens', 'pairs', 'sequence', 'correct']) {
		if (chave in payload) cavar(payload[chave]);
	}
	return achados.filter((t) => t.length > 2);
}

describe.each(CASOS)('atividade em $tag', (caso) => {
	const profile = getProfile(caso.tag);
	const temVoz = profile.tts.voices.length > 0;

	it('gera uma atividade com questões', () => {
		const itens = itensDe(caso);
		expect(itens.length).toBeGreaterThan(0);
	});

	it('é determinística — a mesma seed produz a mesma atividade', () => {
		expect(itensDe(caso)).toEqual(itensDe(caso));
	});

	/**
	 * Regra inviolável nº 1, pelo caminho REAL: o payload é o que o gerador
	 * montou, não um exemplo escrito à mão.
	 */
	it('toRuntime não devolve o gabarito de nenhuma questão', () => {
		const vazamentos: string[] = [];

		for (const item of itensDe(caso)) {
			const interaction = interactionSchema.parse(item.interaction);
			const registrada = getInteraction(interaction.type);
			const runtime = registrada.toRuntime(interaction.payload, `${SEED}:${item.id}`);
			const serializado = JSON.stringify(runtime);

			if (serializado.includes('accepted')) {
				vazamentos.push(`${interaction.type}: a chave "accepted" saiu no runtime`);
			}

			// O texto do gabarito não pode aparecer INTEIRO no payload seguro. Em
			// `assemble`/`order`/`match` os pedaços aparecem embaralhados de
			// propósito — é o banco de tokens —, então o que se procura é a frase
			// montada, não cada palavra.
			for (const texto of textosDoGabarito(item)) {
				const frase = texto.trim();
				// Só frase: um token solto ("book") aparece no banco por desenho.
				if (tokenize(frase, profile).length < 2) continue;
				if (serializado.includes(frase)) {
					vazamentos.push(`${interaction.type}: "${frase}" saiu inteiro no runtime`);
				}
			}
		}

		expect(vazamentos).toEqual([]);
	});

	it('corrige a resposta certa como certa, em cada questão de texto', () => {
		const erros: string[] = [];

		for (const item of itensDe(caso)) {
			const interaction = interactionSchema.parse(item.interaction);
			const grading = gradingSchema.parse(item.grading);
			// Só as que têm uma resposta de TEXTO aceita — as de montar, associar e
			// ordenar respondem com ids, e o gabarito delas já tem teste próprio.
			if (interaction.type !== 'type' && interaction.type !== 'cloze') continue;
			if (grading.mode === 'rubric') continue;

			const payload = interaction.payload as { accepted?: unknown };
			const aceitas = Array.isArray(payload.accepted) ? payload.accepted : [];
			const certa = aceitas.find((a): a is string => typeof a === 'string');
			if (!certa) continue;

			// A resposta é corrigida com o profile da língua em que ela vem.
			const profileDaResposta = getProfile(
				grading.answerLang === 'source' ? item.locale.source : item.locale.target
			);
			const nota = getInteraction(interaction.type).grade(
				interaction.payload,
				{ text: certa },
				profileDaResposta,
				`${SEED}:${item.id}`
			);
			if (!nota.ok) {
				erros.push(`${interaction.type}: grade falhou (${nota.error})`);
			} else if (nota.value.value !== 1) {
				erros.push(`${interaction.type}: "${certa}" valeu ${nota.value.value}, esperado 1`);
			}
		}

		expect(erros).toEqual([]);
	});

	it('não dá nota cheia para uma resposta sem relação', () => {
		const passouIndevidamente: string[] = [];

		for (const item of itensDe(caso)) {
			const interaction = interactionSchema.parse(item.interaction);
			const grading = gradingSchema.parse(item.grading);
			if (interaction.type !== 'type' && interaction.type !== 'cloze') continue;
			if (grading.mode === 'rubric') continue;

			const profileDaResposta = getProfile(
				grading.answerLang === 'source' ? item.locale.source : item.locale.target
			);
			const nota = getInteraction(interaction.type).grade(
				interaction.payload,
				{ text: caso.erradaNoAlvo },
				profileDaResposta,
				`${SEED}:${item.id}`
			);
			if (nota.ok && nota.value.value === 1) {
				passouIndevidamente.push(`${interaction.type} aceitou "${caso.erradaNoAlvo}"`);
			}
		}

		expect(passouIndevidamente).toEqual([]);
	});

	it(temVoz ? 'gera questão de escuta' : 'NÃO gera questão de escuta (idioma sem voz)', () => {
		const comAudio = itensDe(caso).filter(
			(item) => promptSchema.parse(item.prompt).kind === 'audio'
		);
		expect(comAudio.length > 0).toBe(temVoz);
	});

	if (temVoz) {
		it('a voz de cada questão de escuta é uma voz deste idioma', () => {
			const forasteiras: string[] = [];

			for (const item of itensDe(caso)) {
				const prompt = promptSchema.parse(item.prompt);
				if (prompt.kind !== 'audio' || !prompt.text) continue;
				const voz = vozDoTexto(profile, prompt.text);
				if (voz === null || !profile.tts.voices.includes(voz)) {
					forasteiras.push(`"${prompt.text}" → ${voz}`);
				}
			}

			expect(forasteiras).toEqual([]);
		});
	}

	// Sem provedor de TTS o gerador não produz item de escuta em NENHUM idioma —
	// é o que impede a publicação de travar esperando um áudio que não vem.
	it('sem provedor de TTS não sai item de escuta', () => {
		const comAudio = itensDe(caso, false).filter(
			(item) => promptSchema.parse(item.prompt).kind === 'audio'
		);
		expect(comAudio).toEqual([]);
	});

	/**
	 * Regra inviolável nº 5. Em japonês e chinês a frase não tem espaço nenhum:
	 * um `split(' ')` devolveria a frase inteira como um token só, e o banco de
	 * "montar a frase" viria com uma peça — o exercício não existiria.
	 */
	it('tokeniza a frase alvo em palavras, não pelo espaço', () => {
		const alvo = caso.pares[0]!.target;
		const tokens = tokenize(alvo, profile);
		expect(tokens.length).toBeGreaterThan(1);
		// Nenhum token carrega a frase inteira.
		expect(tokens.some((t) => t.length >= alvo.length)).toBe(false);
	});

	it('todo item declara o par de idiomas da atividade', () => {
		const errados = itensDe(caso)
			.filter((item) => item.locale.target !== caso.tag || item.locale.source !== 'pt-BR')
			.map((item) => `${item.generatedBy}: ${item.locale.source} → ${item.locale.target}`);
		expect(errados).toEqual([]);
	});
});

describe('o que vale para qualquer idioma', () => {
	it('nenhum idioma fica sem atividade por causa da escrita', () => {
		const vazios = CASOS.filter((caso) => itensDe(caso).length === 0).map((c) => c.tag);
		expect(vazios).toEqual([]);
	});

	// O árabe é o controle: sem voz, a atividade sai completa e sem escuta. É
	// isso que faz "idioma sem TTS" ser um estado normal e não uma falha.
	it('o idioma sem voz entrega as outras habilidades', () => {
		const arabe = CASOS.find((c) => c.tag === 'ar-SA')!;
		const itens = itensDe(arabe);
		const tipos = new Set(itens.map((i) => interactionSchema.parse(i.interaction).type));
		expect({ temItens: itens.length > 0, maisDeUmTipo: tipos.size > 1 }).toEqual({
			temItens: true,
			maisDeUmTipo: true
		});
	});
});

/**
 * Questão de escrever no idioma alvo, com o teclado do idioma. Nenhum idioma
 * está mais em `ime`: japonês e chinês têm teclado (kana, pinyin) e
 * TRANSCRIÇÃO — o servidor põe a leitura da frase no gabarito, e é ela que o
 * teclado escreve. Aqui, sem o transcritor (o kernel não carrega dicionário), o
 * que se prova é o corte: nada que o teclado não escreva é pedido. Com o
 * transcritor de verdade, o teste é `server/escrita/escrita.test.ts`.
 */
describe('questão de digitar no idioma alvo', () => {
	const precisaDeTranscricao = (tag: string) => {
		const entrada = getProfile(tag).input;
		return entrada.modo === 'grade' && !!entrada.transcricao;
	};

	it('nenhum idioma fica sem teclado para escrever', () => {
		expect(CASOS.filter((c) => getProfile(c.tag).input.modo === 'ime')).toEqual([]);
	});

	it('só japonês e chinês dependem da transcrição', () => {
		expect(
			CASOS.filter((c) => precisaDeTranscricao(c.tag))
				.map((c) => c.tag)
				.sort()
		).toEqual(['ja-JP', 'zh-CN']);
	});

	// O corte não pode vazar para os idiomas cujo teclado escreve o gabarito —
	// lá digitar no alvo é justamente o que o teclado virtual existe para permitir.
	it.each(CASOS.filter((c) => !precisaDeTranscricao(c.tag)))(
		'$tag: tem questão de digitar no idioma alvo',
		(caso) => {
			const digitaNoAlvo = itensDe(caso).filter((item) => {
				const tipo = interactionSchema.parse(item.interaction).type;
				return (
					(tipo === 'type' || tipo === 'cloze') &&
					gradingSchema.parse(item.grading).answerLang !== 'source'
				);
			});
			expect(digitaNoAlvo.length).toBeGreaterThan(0);
		}
	);

	// Sem leitura, a frase em kanji/hanzi segue por montar a frase — nunca vira
	// uma questão que o teclado não responde.
	it.each(CASOS.filter((c) => precisaDeTranscricao(c.tag)))(
		'$tag: sem transcritor, a frase continua sendo montada (assemble)',
		(caso) => {
			const tipos = itensDe(caso).map((i) => interactionSchema.parse(i.interaction).type);
			expect(tipos).toContain('assemble');
		}
	);
});

/**
 * O japonês tem teclado, mas o teclado é de KANA: ele não escreve kanji. O
 * gerador só pede para digitar quando a resposta cabe nele (`language/alcance.ts`).
 * Pedir `私は学生です` a quem só tem kana seria a mesma armadilha do IME — zero
 * com a cara de estar funcionando.
 */
describe('japonês: só se digita o que o kana escreve', () => {
	const ja = getProfile('ja-JP');

	/** Todos os itens de digitar no alvo, SEM a seleção — é o filtro que se testa. */
	function digitaveis(pares: { source: string; target: string }[]) {
		const { groups } = runGenerators(
			pares.map((data, i) => ({ id: `cnt_${i}`, kind: 'SentencePair' as const, data })),
			opcoes(ja, true)
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

	it('frase só em kana vira "ouça e escreva"', () => {
		const itens = digitaveis([
			{ source: 'Bom dia.', target: 'おはようございます。' },
			{ source: 'Obrigado.', target: 'ありがとう。' },
			{ source: 'Café, por favor.', target: 'コーヒーを ください。' }
		]);
		expect(itens.map((i) => i.generatedBy)).toContain('listen-type');
	});

	it('frase com kanji nunca pede a frase inteira digitada', () => {
		const itens = digitaveis([
			{ source: 'Eu sou estudante.', target: '私は学生です。' },
			{ source: 'Este é um livro.', target: 'これは本です。' },
			{ source: 'Ela fala japonês.', target: '彼女は日本語を話します。' }
		]);
		expect(itens.map((i) => i.generatedBy)).not.toContain('listen-type');
	});

	// A lacuna do cloze é UMA palavra — e ela pode ser kana numa frase com
	// kanji (`です`, `は`). Essa pode ser pedida; a de kanji não.
	it('toda resposta de digitar que sobra é escrevível com o kana', () => {
		const itens = digitaveis(CASOS.find((c) => c.tag === 'ja-JP')!.pares);
		const kanji = itens.flatMap((item) => {
			const { accepted } = item.interaction.payload as { accepted: string[] };
			return accepted.filter((r) => /\p{Script=Han}/u.test(r));
		});
		expect(kanji).toEqual([]);
	});
});
