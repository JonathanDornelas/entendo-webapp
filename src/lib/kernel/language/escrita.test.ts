import { describe, expect, it } from 'vitest';
import { comLeituraAceita, type Transcritor } from './escrita';
import { languageProfiles } from './profiles';

/**
 * Quando o gabarito ganha a leitura da frase. O transcritor aqui é de mentira —
 * o de verdade é do servidor e tem teste próprio (`server/escrita`); o que se
 * prova aqui é a REGRA: em que questão pedir, o que acrescentar, o que manter.
 */

const ja = languageProfiles['ja-JP']!;
const en = languageProfiles['en-US']!;

/** Lê só o que conhece, e registra o que foi pedido. */
function transcritorDeTeste(leituras: Record<string, string>) {
	const pedidos: string[] = [];
	const transcrever: Transcritor = ({ antes, alvo, depois }) => {
		pedidos.push(`${antes}[${alvo}]${depois}`);
		const leitura = leituras[alvo];
		return leitura ? [leitura] : [];
	};
	return { transcrever, pedidos };
}

const escuta = (accepted: string[]) => ({ type: 'type' as const, payload: { accepted } });

describe('comLeituraAceita', () => {
	it('acrescenta a leitura DEPOIS do gabarito, que continua sendo o primeiro', () => {
		const { transcrever } = transcritorDeTeste({ 明日友達に会います: 'あしたともだちにあいます' });
		expect(comLeituraAceita(escuta(['明日友達に会います']), {}, ja, transcrever)).toEqual({
			accepted: ['明日友達に会います', 'あしたともだちにあいます']
		});
	});

	// A leitura que o professor deixou (ou corrigiu) no editor vence: nada é
	// recalculado por cima dela.
	it('não mexe quando alguma resposta já cabe no teclado', () => {
		const { transcrever, pedidos } = transcritorDeTeste({ 何: 'なん' });
		const payload = { accepted: ['何', 'なに'] };
		expect(comLeituraAceita({ type: 'type', payload }, {}, ja, transcrever)).toBe(payload);
		expect(pedidos).toEqual([]);
	});

	// Na lacuna, o transcritor recebe a frase em volta: `会` sozinho é `kai`.
	it('na lacuna, pede a leitura com a frase inteira de contexto', () => {
		const { transcrever, pedidos } = transcritorDeTeste({ 学校: 'がっこう' });
		const payload = { masked: '明日___に行きます。', accepted: ['学校'] };
		expect(comLeituraAceita({ type: 'cloze', payload }, {}, ja, transcrever)).toEqual({
			...payload,
			accepted: ['学校', 'がっこう']
		});
		expect(pedidos).toEqual(['明日[学校]に行きます。']);
	});

	it('com duas lacunas não há onde cortar a leitura: fica como está', () => {
		const { transcrever } = transcritorDeTeste({ 学校: 'がっこう' });
		const payload = { masked: '___に___。', accepted: ['学校'] };
		expect(comLeituraAceita({ type: 'cloze', payload }, {}, ja, transcrever)).toBe(payload);
	});

	// Na língua do aluno o aparelho é dele.
	it('não toca na tradução para a língua do aluno', () => {
		const { transcrever, pedidos } = transcritorDeTeste({});
		const payload = { accepted: ['Amanhã encontro um amigo.'] };
		comLeituraAceita({ type: 'type', payload }, { answerLang: 'source' }, ja, transcrever);
		expect(pedidos).toEqual([]);
	});

	it('não toca em idioma sem transcrição, nem em questão que não é de digitar', () => {
		const { transcrever, pedidos } = transcritorDeTeste({});
		comLeituraAceita(escuta(['I have finished']), {}, en, transcrever);
		comLeituraAceita({ type: 'choice', payload: { accepted: ['会'] } }, {}, ja, transcrever);
		expect(pedidos).toEqual([]);
	});

	// Leitura que o teclado também não escreve não resolve nada — não entra.
	it('descarta a leitura que o teclado não alcança', () => {
		const { transcrever } = transcritorDeTeste({ '3時': '3じ' });
		const payload = { accepted: ['3時'] };
		expect(comLeituraAceita({ type: 'type', payload }, {}, ja, transcrever)).toBe(payload);
	});

	it('sem transcritor, fica como está', () => {
		const payload = { accepted: ['明日友達に会います'] };
		expect(comLeituraAceita({ type: 'type', payload }, {}, ja, undefined)).toBe(payload);
	});
});
