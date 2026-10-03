/**
 * As cores do avatar. São hex LITERAIS de propósito, e é a única pasta do
 * projeto onde isso vale: não são cor de interface, são cor de conteúdo —
 * pele, cabelo, roupa. Um token semântico (`primary`, `base-200`) trocaria de
 * valor com o tema, e o avatar de uma pessoa não pode mudar de pele quando ela
 * aperta o botão do tema escuro.
 *
 * Dois hex por peça onde existe volume (pele, cabelo, roupa, acessório): o
 * primeiro é a cor cheia, o segundo é a sombra. Em 16 pixels é essa dupla que
 * dá forma — sem ela o cabelo fica uma mancha chapada.
 */

/** [cheio, sombra] — a sombra também é a cor das MÃOS quando a pose mostra os braços. */
export const PELE: readonly (readonly [string, string])[] = [
	['#F8DAC6', '#E4B79C'],
	['#F0C4A6', '#D6A183'],
	['#DDA173', '#BF8154'],
	['#B87449', '#985C35'],
	['#8D5634', '#6F3F23'],
	['#6A3E25', '#4E2C19']
];

/** Nove cores, incluindo as que não existem na vida real. Vale para a BARBA também. */
export const CABELO_COR: readonly (readonly [string, string])[] = [
	['#2A2A33', '#18181F'],
	['#4A3728', '#33251A'],
	['#7C4C2A', '#5E3820'],
	['#B5651D', '#8F4E13'],
	['#DCA75E', '#B98442'],
	['#E6E3DE', '#C2BEB8'],
	['#9B87B5', '#7B6894'],
	['#2E9BC4', '#1F7A9E'],
	['#C2566B', '#9C3F52']
];

/** A íris. Só aparece nos olhos grandes e nos surpresos — nos outros o olho tem 2 pixels. */
export const OLHO_COR: readonly string[] = ['#22222A', '#4A3728', '#2F7A52', '#1F7A9E', '#6B4E9E'];

/** A armação. A escura cobre os olhos de propósito. */
export const OCULOS_COR: readonly string[] = ['#2F2C3D', '#8F4E13', '#D9A93A', '#0EA5B7'];

export const ACESSORIO_COR: readonly (readonly [string, string])[] = [
	['#3E9E6B', '#2F7A52'],
	['#5A3FF3', '#432EC0'],
	['#C8324A', '#9E2539'],
	['#2F2C3D', '#1E1C29'],
	['#E0A93A', '#B5862A'],
	['#EDEBF5', '#CFCCDD']
];

export const ROUPA_COR: readonly (readonly [string, string])[] = [
	['#5A3FF3', '#432EC0'],
	['#0EA5B7', '#0A8291'],
	['#E0A93A', '#B5862A'],
	['#3E9E6B', '#2F7A52'],
	['#C8324A', '#9E2539'],
	['#6B6690', '#534F71'],
	['#2F2C3D', '#1E1C29'],
	['#EDEBF5', '#CFCCDD']
];

/**
 * Doze cores chapadas. Em 32px o fundo é o que diferencia duas pessoas de
 * longe — por isso ele é peça, não decoração.
 */
export const FUNDO: readonly string[] = [
	'#F6E7A8',
	'#DCD5FF',
	'#F0DFF6',
	'#B9D6EE',
	'#F3C9D6',
	'#CBEBD6',
	'#F6DAC0',
	'#C9C2EF',
	'#D8EDE3',
	'#EFE6C6',
	'#E4E2EA',
	'#EFD8F0'
];
