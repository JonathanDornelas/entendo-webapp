import { describe, expect, it } from 'vitest';
import {
	CASAS,
	CODIGO_PADRAO,
	LADO,
	LIMITES,
	avatarPadrao,
	decodificar,
	montarAvatar,
	normalizar,
	sortearCodigo
} from './montar';
import {
	ACESSORIOS,
	BARBAS,
	BASE,
	BOCAS,
	CABELOS,
	DETALHES,
	OCULOS,
	OLHOS,
	ORELHAS,
	POSES,
	ROUPAS,
	type Camada
} from './pecas';
import { CABELO_COR, FUNDO, OCULOS_COR, OLHO_COR, PELE } from './paletas';
import { CATEGORIAS } from './catalogo';

/**
 * O avatar é enfeite ao lado de um nome: ele não pode derrubar a tela que só
 * queria mostrar o nome. Daí o peso dos testes de entrada podre — eles são a
 * razão de `decodificar` não lançar nunca.
 */
describe('peças', () => {
	const todas: [string, readonly Camada[]][] = [
		['BASE', [BASE]],
		['ORELHAS', [ORELHAS]],
		['CABELOS', CABELOS],
		['OLHOS', OLHOS],
		['BOCAS', BOCAS],
		['BARBAS', BARBAS],
		['OCULOS', OCULOS],
		['DETALHES', DETALHES],
		['ROUPAS', ROUPAS],
		['POSES', POSES.map(([camada]) => camada)],
		['ACESSORIOS', ACESSORIOS]
	];

	// Uma linha curta desloca todo pixel à direita dela, e o erro é quase
	// invisível em 16px — some como "o boné ficou meio torto".
	it.each(todas)('%s: toda linha tem exatamente 16 caracteres', (_nome, lista) => {
		const erradas = lista.flatMap((camada, i) =>
			Object.entries(camada)
				.filter(([, linha]) => linha.length !== LADO)
				.map(([y, linha]) => `peça ${i}, linha ${y}: ${linha.length} caracteres`)
		);
		expect(erradas).toEqual([]);
	});

	it.each(todas)('%s: toda linha cai dentro do quadriculado', (_nome, lista) => {
		const fora = lista.flatMap((camada, i) =>
			Object.keys(camada)
				.map(Number)
				.filter((y) => !Number.isInteger(y) || y < 0 || y >= LADO)
				.map((y) => `peça ${i}: linha ${y}`)
		);
		expect(fora).toEqual([]);
	});

	// `LIMITES` é o que o editor e o sorteio usam para saber quantas opções
	// existem. Se ele discordar do array de peças, o sorteio gera índice que
	// dá a volta e duas opções do editor desenham a mesma coisa.
	it('LIMITES bate com o número real de peças de cada casa', () => {
		expect({
			pele: LIMITES[0],
			cabelo: LIMITES[1],
			corCabelo: LIMITES[2],
			olhos: LIMITES[3],
			corOlhos: LIMITES[4],
			boca: LIMITES[5],
			barba: LIMITES[6],
			oculos: LIMITES[7],
			corOculos: LIMITES[8],
			detalhe: LIMITES[9],
			roupa: LIMITES[10],
			pose: LIMITES[12],
			acessorio: LIMITES[13],
			fundo: LIMITES[15]
		}).toEqual({
			pele: PELE.length,
			cabelo: CABELOS.length,
			corCabelo: CABELO_COR.length,
			olhos: OLHOS.length,
			corOlhos: OLHO_COR.length,
			boca: BOCAS.length,
			barba: BARBAS.length,
			oculos: OCULOS.length,
			corOculos: OCULOS_COR.length,
			detalhe: DETALHES.length,
			roupa: ROUPAS.length,
			pose: POSES.length,
			acessorio: ACESSORIOS.length,
			fundo: FUNDO.length
		});
	});

	// Cada categoria do editor aponta para uma casa do código; o nome mostrado
	// vem de uma lista paralela. Lista mais curta = botão sem rótulo.
	it('o catálogo tem um nome para cada peça da categoria', () => {
		const faltando = CATEGORIAS.filter(
			(c) => c.iForma !== null && c.nomes.length !== c.nFormas
		).map((c) => `${c.chave}: ${c.nomes.length} nomes para ${c.nFormas} peças`);
		expect(faltando).toEqual([]);
	});
});

describe('decodificar', () => {
	it('lê as dezoito casas na ordem do código', () => {
		expect(decodificar('1-2-3-4-0-1-2-3-0-1-5-6-2-7-3-8-9-10')).toEqual({
			pele: 1,
			cabelo: 2,
			corCabelo: 3,
			olhos: 4,
			corOlhos: 0,
			boca: 1,
			barba: 2,
			oculos: 3,
			corOculos: 0,
			detalhe: 1,
			roupa: 5,
			corRoupa: 6,
			pose: 2,
			acessorio: 7,
			corAcessorio: 3,
			fundo: 8,
			acessorio2: 9,
			acessorio3: 10
		});
	});

	it.each([
		['vazio', ''],
		['texto no lugar de número', 'a-b-c'],
		['negativo', '-1--2'],
		['casas faltando', '3-1'],
		['casas demais', new Array(40).fill(2).join('-')],
		['separador errado', '1,2,3'],
		['decimal', '1.5-2.7']
	])('não lança com entrada podre: %s', (_caso, codigo) => {
		expect(() => montarAvatar(codigo)).not.toThrow();
	});

	it('índice além do fim da lista dá a volta em vez de sumir', () => {
		// 99 cabelos não existem; o avatar ainda tem que desenhar um.
		const volta = montarAvatar('0-99-0-0-0-0-0-0-0-0-0-0-0-0-0-0');
		expect(volta.faixas.length).toBeGreaterThan(0);
	});
});

describe('normalizar', () => {
	it('devolve as dezoito casas dentro dos limites', () => {
		const casas = normalizar('99-99-99-99-99-99-99-99-99-99-99-99-99-99-99-99-99-99').split('-');
		expect({
			n: casas.length,
			foraDoLimite: casas.filter((v, i) => Number(v) >= (LIMITES[i] ?? LIMITES[13]!))
		}).toEqual({ n: CASAS, foraDoLimite: [] });
	});

	it('é idempotente — normalizar duas vezes dá o mesmo', () => {
		const uma = normalizar('4-11-8-7-4-6-5-5-3-2-15-7-6-12-5-11-3-9');
		expect(normalizar(uma)).toBe(uma);
	});

	it('completa as casas que faltam com zero', () => {
		expect(normalizar('2-3')).toBe('2-3-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0');
	});
});

describe('montarAvatar', () => {
	it('é determinístico — o mesmo código dá o mesmo desenho', () => {
		const codigo = '3-5-2-1-4-2-3-1-2-1-7-4-3-2-1-6-5-0';
		expect(montarAvatar(codigo)).toEqual(montarAvatar(codigo));
	});

	it('toda faixa cabe dentro do quadriculado', () => {
		const fora: string[] = [];
		let seed = 99;
		const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
		for (let i = 0; i < 400; i++) {
			for (const f of montarAvatar(sortearCodigo(rnd)).faixas) {
				if (f.x < 0 || f.y < 0 || f.y >= LADO || f.w < 1 || f.x + f.w > LADO) {
					fora.push(JSON.stringify(f));
				}
			}
		}
		expect(fora).toEqual([]);
	});

	it('toda cor é um hex de seis dígitos', () => {
		const ruins = montarAvatar(sortearCodigo(() => 0.5))
			.faixas.map((f) => f.f)
			.filter((c) => !/^#[0-9A-Fa-f]{6}$/.test(c));
		expect(ruins).toEqual([]);
	});

	it('junta pixels vizinhos da mesma cor numa faixa só', () => {
		// Nenhuma faixa pode ser seguida por outra da mesma cor e encostada
		// nela: seriam dois `<rect>` onde um bastava.
		const { faixas } = montarAvatar(CODIGO_PADRAO);
		const emendas = faixas.filter((f, i) => {
			const proxima = faixas[i + 1];
			return proxima && proxima.y === f.y && proxima.x === f.x + f.w && proxima.f === f.f;
		});
		expect(emendas).toEqual([]);
	});

	it('a cor de fundo sai da paleta de fundo', () => {
		expect(FUNDO).toContain(montarAvatar(CODIGO_PADRAO).bg);
	});

	it('o código padrão desenha alguma coisa', () => {
		expect(montarAvatar(CODIGO_PADRAO).faixas.length).toBeGreaterThan(20);
	});
});

describe('sortearCodigo', () => {
	it('sorteia só dentro dos limites de cada casa', () => {
		const fora: string[] = [];
		let seed = 7;
		const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
		for (let i = 0; i < 2000; i++) {
			const casas = sortearCodigo(rnd).split('-').map(Number);
			if (casas.length !== CASAS) fora.push(`casas: ${casas.length}`);
			casas.forEach((v, j) => {
				const limite = LIMITES[j] ?? LIMITES[13]!;
				if (v < 0 || v >= limite) fora.push(`casa ${j}: ${v} (limite ${limite})`);
			});
		}
		expect(fora).toEqual([]);
	});

	it('é determinístico com gerador determinístico', () => {
		const semente = () => {
			let s = 42;
			return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
		};
		expect(sortearCodigo(semente())).toBe(sortearCodigo(semente()));
	});

	it('a maioria dos sorteios deixa o rosto à vista, sem segundo acessório', () => {
		let seed = 2024;
		const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
		const total = 3000;
		let comSegundo = 0;
		for (let i = 0; i < total; i++) {
			if (Number(sortearCodigo(rnd).split('-')[16]) > 0) comSegundo++;
		}
		// 30% por desenho — com acessório sempre presente, todo avatar sorteado
		// vinha de capacete e o rosto ficava escondido.
		expect(comSegundo / total).toBeLessThan(0.4);
	});
});

describe('avatarPadrao — quem não tem avatar gravado', () => {
	it('é sempre o mesmo rosto para o mesmo nome', () => {
		expect(avatarPadrao('Juliana Prado')).toBe(avatarPadrao('Juliana Prado'));
	});

	it('é um código válido, já na forma que iria para o banco', () => {
		for (const nome of ['Ana', 'Pedro Alves', '佐藤 明', 'محمد', '']) {
			const codigo = avatarPadrao(nome);
			expect(codigo.split('-')).toHaveLength(CASAS);
			expect(normalizar(codigo)).toBe(codigo);
		}
	});

	it('nomes diferentes dão rostos diferentes (quase sempre)', () => {
		const nomes = Array.from({ length: 40 }, (_, i) => `Aluno ${i}`);
		expect(new Set(nomes.map(avatarPadrao)).size).toBeGreaterThan(38);
	});

	it('"José" composto e pré-composto são a mesma pessoa', () => {
		const preComposto = 'Jos\u00e9';
		const composto = 'Jose\u0301';
		expect(avatarPadrao(composto)).toBe(avatarPadrao(preComposto));
	});
});
