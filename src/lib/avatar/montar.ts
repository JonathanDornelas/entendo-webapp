/**
 * O avatar da conta. Uma função pura: código → retângulos de um SVG 16×16.
 *
 * **O avatar é gravado como DEZOITO NÚMEROS, nunca como imagem.** Um código
 * como `1-2-1-1-0-0-0-0-0-1-0-0-0-1-0-4-0-0` cabe numa coluna de texto, viaja
 * no `load` sem custo, não passa pelo bucket e não tem prazo de validade — ao
 * contrário de um PNG, que precisaria de upload, de uma chave no storage e de
 * uma regra de ciclo de vida. Mudar uma peça é reescrever um número.
 *
 * Isomórfico de propósito: a mesma função desenha a prévia no editor e o avatar
 * ao lado do nome na lista de turma. O editor não pode "quase" mostrar o que
 * vai ser gravado.
 */
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
import { ACESSORIO_COR, CABELO_COR, FUNDO, OCULOS_COR, OLHO_COR, PELE, ROUPA_COR } from './paletas';

/** Lado do quadriculado. 16 é o desenho; não é um número que se ajusta. */
export const LADO = 16;

/**
 * Quantas opções cada casa do código aceita, na ORDEM do código. As três casas
 * de acessório compartilham o mesmo limite (a de índice 13 mais as duas extras,
 * 16 e 17), por isso a lista tem 16 entradas para 18 casas.
 */
export const LIMITES: readonly number[] = [6, 16, 9, 8, 5, 7, 6, 6, 4, 3, 16, 8, 7, 13, 6, 12];

/** Quantas casas o código tem. As duas últimas são o 2º e o 3º acessório. */
export const CASAS = 18;

/** O avatar de quem nunca abriu o editor. Legível, neutro, e nada de branco. */
export const CODIGO_PADRAO = '1-0-1-0-0-0-0-0-0-1-0-0-0-0-0-1-0-0';

/** As peças escolhidas, já separadas por papel. */
export interface Pecas {
	pele: number;
	cabelo: number;
	corCabelo: number;
	olhos: number;
	corOlhos: number;
	boca: number;
	barba: number;
	oculos: number;
	corOculos: number;
	detalhe: number;
	roupa: number;
	corRoupa: number;
	pose: number;
	acessorio: number;
	corAcessorio: number;
	fundo: number;
	acessorio2: number;
	acessorio3: number;
}

/** Uma faixa horizontal de pixels da mesma cor — um `<rect>` de altura 1. */
export interface Faixa {
	x: number;
	y: number;
	/** Largura em pixels do quadriculado, não em px de tela. */
	w: number;
	/** Hex literal — ver o porquê em `paletas.ts`. */
	f: string;
}

export interface Avatar {
	/** Cor de fundo chapada, atrás de tudo. */
	bg: string;
	faixas: Faixa[];
}

/**
 * Lê o código. Nunca lança: casa faltando, texto no lugar de número e código
 * vazio todos viram zero, e um índice além do fim da lista dá a volta (`%`).
 * Um avatar é enfeite — ele não pode derrubar a tela que só queria mostrar um
 * nome ao lado dele.
 */
export function decodificar(codigo: string): Pecas {
	const n = String(codigo ?? '')
		.split('-')
		.map((parte) => {
			const v = Number.parseInt(parte, 10);
			return Number.isFinite(v) && v >= 0 ? v : 0;
		});
	const em = (i: number) => n[i] ?? 0;

	return {
		pele: em(0),
		cabelo: em(1),
		corCabelo: em(2),
		olhos: em(3),
		corOlhos: em(4),
		boca: em(5),
		barba: em(6),
		oculos: em(7),
		corOculos: em(8),
		detalhe: em(9),
		roupa: em(10),
		corRoupa: em(11),
		pose: em(12),
		acessorio: em(13),
		corAcessorio: em(14),
		fundo: em(15),
		acessorio2: em(16),
		acessorio3: em(17)
	};
}

/** Normaliza para 18 casas dentro dos limites — a forma que vai para o banco. */
export function normalizar(codigo: string): string {
	const p = decodificar(codigo);
	const casas = [
		p.pele,
		p.cabelo,
		p.corCabelo,
		p.olhos,
		p.corOlhos,
		p.boca,
		p.barba,
		p.oculos,
		p.corOculos,
		p.detalhe,
		p.roupa,
		p.corRoupa,
		p.pose,
		p.acessorio,
		p.corAcessorio,
		p.fundo,
		p.acessorio2,
		p.acessorio3
	];
	// As duas casas extras de acessório usam o limite da primeira (índice 13).
	return casas.map((v, i) => v % (LIMITES[i] ?? LIMITES[13])).join('-');
}

/** Índice seguro: dá a volta em vez de devolver `undefined`. */
function pegar<T>(lista: readonly T[], i: number): T {
	return lista[(i || 0) % lista.length] as T;
}

/**
 * Compõe as peças e devolve as faixas de cor.
 *
 * A ORDEM das camadas é o desenho, não uma preferência. Duas passagens importam:
 * o cabelo é pintado ANTES do corpo (para a nuca ficar atrás do ombro) e DE
 * NOVO depois (para a franja ficar na frente do rosto); e a roupa só pinta onde
 * a pose tem corpo, senão a manga aparece no vazio ao lado de quem está de
 * perfil.
 */
export function montarAvatar(codigo: string): Avatar {
	const p = decodificar(codigo);

	const pele = pegar(PELE, p.pele);
	const corCabelo = pegar(CABELO_COR, p.corCabelo);
	const corRoupa = pegar(ROUPA_COR, p.corRoupa);
	const corAcessorio = pegar(ACESSORIO_COR, p.corAcessorio);
	const cabelo = pegar(CABELOS, p.cabelo);
	const [pose, topoDoOmbro] = pegar(POSES, p.pose);
	const roupa = pegar(ROUPAS, p.roupa);

	const grade: string[][] = [];
	for (let y = 0; y < LADO; y++) grade.push(new Array<string>(LADO).fill(' '));

	const pintar = (camada: Camada, dy = 0, onde?: (x: number, y: number) => boolean) => {
		for (const chave of Object.keys(camada)) {
			const y = Number(chave) + dy;
			if (y < 0 || y >= LADO) continue;
			const linha = camada[Number(chave)] ?? '';
			for (let x = 0; x < LADO; x++) {
				const c = linha[x];
				if (!c || c === ' ') continue;
				if (onde && !onde(x, y)) continue;
				(grade[y] as string[])[x] = c;
			}
		}
	};

	// A silhueta da pose: é ela que diz onde a roupa pode existir.
	const silhueta: boolean[][] = [];
	for (let y = 0; y < LADO; y++) silhueta.push(new Array<boolean>(LADO).fill(false));
	for (const chave of Object.keys(pose)) {
		const y = Number(chave);
		const linha = pose[y] ?? '';
		for (let x = 0; x < LADO; x++) {
			if (linha[x] && linha[x] !== ' ') (silhueta[y] as boolean[])[x] = true;
		}
	}

	pintar(cabelo); // nuca, atrás do ombro
	pintar(pose);
	pintar(BASE);
	pintar(ORELHAS);
	pintar(roupa, topoDoOmbro - 12, (x, y) => y < topoDoOmbro || (silhueta[y]?.[x] ?? false));
	pintar(cabelo); // franja, na frente do rosto
	pintar({ 7: '        S       ' }); // o nariz — um pixel, e ele resolve o perfil
	pintar(pegar(DETALHES, p.detalhe));
	pintar(pegar(BARBAS, p.barba));
	pintar(pegar(OLHOS, p.olhos));
	pintar(pegar(BOCAS, p.boca));
	pintar(pegar(OCULOS, p.oculos));
	pintar(pegar(ACESSORIOS, p.acessorio));
	if (p.acessorio2) pintar(pegar(ACESSORIOS, p.acessorio2));
	if (p.acessorio3) pintar(pegar(ACESSORIOS, p.acessorio3));

	// Letra → cor. `w` (branco de tecido), `t` (vermelho de gravata), `m`
	// (boca), `B` (bochecha) e `z`/`Z` (lâmina) não têm paleta: são detalhe
	// fixo de peça, e trocar de cor neles não melhoraria nada.
	const COR: Record<string, string> = {
		s: pele[0],
		S: pele[1],
		n: pele[1],
		h: corCabelo[0],
		H: corCabelo[1],
		b: corCabelo[0],
		c: corRoupa[0],
		C: corRoupa[1],
		w: '#F4F3F8',
		t: '#C8324A',
		e: '#FFFFFF',
		p: pegar(OLHO_COR, p.corOlhos),
		m: '#8A4A52',
		g: pegar(OCULOS_COR, p.corOculos),
		B: '#E2707F',
		a: corAcessorio[0],
		k: corAcessorio[0],
		K: corAcessorio[1],
		f: corAcessorio[0],
		z: '#8E97A8',
		Z: '#E4E9F1'
	};

	// Pixels vizinhos da mesma cor viram UM retângulo. Um `<rect>` por pixel
	// daria 256 nós por avatar, e a lista de turma desenha dezenas deles.
	const faixas: Faixa[] = [];
	for (let y = 0; y < LADO; y++) {
		let x = 0;
		while (x < LADO) {
			const c = (grade[y] as string[])[x] as string;
			if (c === ' ' || !COR[c]) {
				x++;
				continue;
			}
			let w = 1;
			while (x + w < LADO && (grade[y] as string[])[x + w] === c) w++;
			faixas.push({ x, y, w, f: COR[c] as string });
			x += w;
		}
	}

	return { bg: pegar(FUNDO, p.fundo), faixas };
}

/**
 * Um avatar aleatório. Recebe o gerador para ser testável — e porque a tela
 * do aluno sorteia no clique, onde `Math.random` é exatamente o certo.
 *
 * O segundo acessório sai em 30% dos sorteios: com ele sempre presente todo
 * avatar sorteado vinha de capacete, e o rosto — que é o que a pessoa
 * reconhece — ficava escondido na maioria.
 */
export function sortearCodigo(rnd: () => number = Math.random): string {
	const casas = LIMITES.map((limite) => Math.floor(rnd() * limite));
	const segundoAcessorio = rnd() < 0.3 ? 1 + Math.floor(rnd() * (ACESSORIOS.length - 1)) : 0;
	return [...casas, segundoAcessorio, 0].join('-');
}
