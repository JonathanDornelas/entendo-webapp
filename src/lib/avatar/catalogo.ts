/**
 * O que o EDITOR mostra: as onze categorias, na ordem em que aparecem, com o
 * nome de cada peça e a paleta de cada uma.
 *
 * Separado de `pecas.ts` porque são coisas diferentes: lá é o desenho, aqui é
 * a vitrine. O desenho não muda quando a gente renomeia "espetado" para
 * "moicano", e a lista de nomes não pode decidir a ordem de pintura.
 *
 * Cada categoria aponta para as CASAS do código que ela mexe: `iForma` é a casa
 * da peça, `iCor` a casa da cor. Onde só existe cor (pele, fundo), `iForma` é
 * nulo e o editor mostra só a paleta.
 */
import { ACESSORIO_COR, CABELO_COR, FUNDO, OCULOS_COR, OLHO_COR, PELE, ROUPA_COR } from './paletas';
import { ACESSORIOS, BARBAS, BOCAS, CABELOS, DETALHES, OCULOS, OLHOS, ROUPAS } from './pecas';

export interface Categoria {
	chave: string;
	label: string;
	/** Casa do código que guarda a PEÇA. Nulo quando a categoria é só cor. */
	iForma: number | null;
	/** Quantas peças a categoria tem. Zero quando é só cor. */
	nFormas: number;
	/** Casa do código que guarda a COR. */
	iCor: number;
	/** As cores oferecidas — só o tom cheio; a sombra sai junto em `paletas.ts`. */
	paleta: readonly string[];
	/** Rótulo do bloco de cor. Vazio quando a categoria não tem cor própria. */
	corLabel: string;
	/** O nome de cada peça, na ordem do array de peças. */
	nomes: readonly string[];
	/** A frase que explica a categoria no editor. */
	nota: string;
}

const soOTom = (pares: readonly (readonly [string, string])[]) => pares.map(([cheio]) => cheio);

export const CATEGORIAS: readonly Categoria[] = [
	{
		chave: 'pele',
		label: 'Pele',
		iForma: null,
		nFormas: 0,
		iCor: 0,
		paleta: soOTom(PELE),
		corLabel: 'Tom de pele',
		nomes: [],
		nota: 'Seis tons. O mesmo tom aparece nas mãos, quando a pose mostra os braços.'
	},
	{
		chave: 'cabelo',
		label: 'Cabelo',
		iForma: 1,
		nFormas: CABELOS.length,
		iCor: 2,
		paleta: soOTom(CABELO_COR),
		corLabel: 'Cor do cabelo',
		nomes: [
			'curto',
			'franja',
			'longo',
			'volumoso',
			'coque',
			'maria-chiquinha',
			'rabo de cavalo',
			'dreads',
			'espetado',
			'careca',
			'raspado',
			'véu',
			'moicano',
			'tranças',
			'samurai',
			'repicado'
		],
		nota: 'Dezesseis cortes legíveis em 16 pixels, em nove cores — incluindo as que não existem na vida real.'
	},
	{
		chave: 'olhos',
		label: 'Olhos',
		iForma: 3,
		nFormas: OLHOS.length,
		iCor: 4,
		paleta: OLHO_COR,
		corLabel: 'Cor dos olhos',
		nomes: [
			'atentos',
			'grandes',
			'felizes',
			'sonolentos',
			'surpresos',
			'de lado',
			'bravos',
			'coração'
		],
		nota: 'A expressão inteira cabe em dois ou quatro pixels. A cor da íris só aparece nos olhos grandes e surpresos.'
	},
	{
		chave: 'boca',
		label: 'Boca',
		iForma: 5,
		nFormas: BOCAS.length,
		iCor: -1,
		paleta: [],
		corLabel: '',
		nomes: ['sorriso', 'risada', 'séria', 'canto', 'bico', 'dentes', 'sem boca'],
		nota: 'Sete bocas, contando a de ficar sem nenhuma. "Bico" e "dentes" mudam o personagem mais do que parece.'
	},
	{
		chave: 'barba',
		label: 'Barba',
		iForma: 6,
		nFormas: BARBAS.length,
		iCor: 2,
		paleta: soOTom(CABELO_COR),
		corLabel: 'Cor da barba — é a mesma do cabelo',
		nomes: ['nenhuma', 'bigode', 'cavanhaque', 'cheia', 'por fazer', 'costeletas'],
		nota: 'Seis opções, das costeletas pontudas à barba cheia. A cor é a mesma do cabelo, como na vida.'
	},
	{
		chave: 'oculos',
		label: 'Óculos',
		iForma: 7,
		nFormas: OCULOS.length,
		iCor: 8,
		paleta: OCULOS_COR,
		corLabel: 'Cor da armação',
		nomes: ['nenhum', 'redondo', 'quadrado', 'escuro', 'esportivo', 'monóculo'],
		nota: 'Seis armações em quatro cores. A escura cobre os olhos de propósito, e o esportivo é uma faixa só.'
	},
	{
		chave: 'detalhe',
		label: 'Rosto',
		iForma: 9,
		nFormas: DETALHES.length,
		iCor: -1,
		paleta: [],
		corLabel: '',
		nomes: ['nenhum', 'bochecha', 'sardas'],
		nota: 'Bochecha rosada ou sardas. Some nos tamanhos pequenos, e é para ser assim.'
	},
	{
		chave: 'roupa',
		label: 'Roupa',
		iForma: 10,
		nFormas: ROUPAS.length,
		iCor: 11,
		paleta: soOTom(ROUPA_COR),
		corLabel: 'Cor da roupa',
		nomes: [
			'camiseta',
			'listrada',
			'gola alta',
			'social',
			'gravata',
			'capuz',
			'regata',
			'jaleco',
			'quimono',
			'armadura',
			'traje futurista',
			'camisa de time',
			'capa',
			'moletom',
			'kimono',
			'sem camisa'
		],
		nota: 'Dezesseis peças em oito cores, da camiseta à armadura. Elas mudam a gola e o peito, e acompanham a pose.'
	},
	{
		chave: 'pose',
		label: 'Pose',
		iForma: 12,
		nFormas: 7,
		iCor: -1,
		paleta: [],
		corLabel: '',
		nomes: [
			'de frente',
			'ombro torto',
			'de perfil',
			'acenando',
			'braços cruzados',
			'ombros à mostra',
			'punho erguido'
		],
		nota: 'Sete posturas. "Acenando", "braços cruzados" e "punho erguido" mudam a silhueta inteira.'
	},
	{
		chave: 'acessorio',
		label: 'Acessório',
		iForma: 13,
		nFormas: ACESSORIOS.length,
		iCor: 14,
		paleta: soOTom(ACESSORIO_COR),
		corLabel: 'Cor do acessório',
		nomes: [
			'nenhum',
			'brinco',
			'boné',
			'gorro',
			'fone',
			'tiara',
			'máscara ninja',
			'bandana',
			'coroa',
			'elmo',
			'visor',
			'capacete',
			'espada'
		],
		nota: 'Treze peças, do brinco à espada atravessada nas costas. Dá para usar até três ao mesmo tempo — toque para ligar e desligar. Tudo que vai na cabeça cobre parte do cabelo.'
	},
	{
		chave: 'fundo',
		label: 'Fundo',
		iForma: null,
		nFormas: 0,
		iCor: 15,
		paleta: FUNDO,
		corLabel: 'Cor de fundo',
		nomes: [],
		nota: 'Doze cores chapadas. Em 32px o fundo é o que diferencia duas pessoas de longe.'
	}
];

/** A categoria que o editor abre primeiro — a que muda mais o personagem. */
export const CATEGORIA_INICIAL = 'cabelo';

/**
 * A casa que guarda a PRIMEIRA peça de acessório, e as duas extras. Estão aqui
 * porque o acessório é a única categoria de escolha múltipla, e as três telas
 * que mexem nele precisam concordar em quais casas são.
 */
export const CASAS_ACESSORIO = [13, 16, 17] as const;

/** Quantos acessórios podem estar ligados ao mesmo tempo. */
export const MAX_ACESSORIOS = CASAS_ACESSORIO.length;

/**
 * Avatares prontos, para quem não quer montar nada. Vêm primeiro no editor: a
 * maioria das pessoas escolhe um destes e fecha (paginas.md "Conta").
 */
export const SUGESTOES: readonly string[] = [
	'0-0-4-1-3-0-0-0-0-1-0-1-0-0-0-0',
	'2-3-0-0-0-1-0-0-0-2-1-3-1-0-0-5',
	'4-7-0-1-0-0-0-1-0-1-2-6-0-1-3-3',
	'1-5-6-2-4-0-0-0-0-1-7-7-5-5-1-2',
	'3-1-1-0-1-3-1-0-0-0-3-4-4-0-0-9',
	'5-11-0-1-2-0-0-3-0-1-4-1-2-0-0-7',
	'1-8-7-4-3-5-0-0-0-2-6-0-3-2-1-8',
	'2-6-3-0-1-0-0-2-2-1-5-5-1-4-3-11'
];
