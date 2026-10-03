/**
 * O avatar é pixel art de 16×16, e cada peça é um mapa de LINHA → 16 caracteres.
 * Uma letra é um papel de cor, não uma cor: `s` é pele cheia, `S` é a sombra da
 * pele, `h` cabelo, `H` sombra do cabelo, e assim por diante (a tabela completa
 * é `COR` em `montar.ts`). É isso que deixa a mesma peça servir para as seis
 * pelagens e as nove cores de cabelo sem uma cópia por combinação.
 *
 * Espaço é transparente. As linhas TÊM que ter 16 caracteres — as peças são
 * desenhadas por coluna, e uma linha curta desloca tudo à direita dela. O teste
 * `montar.spec.ts` verifica isso em todas as peças.
 *
 * A ordem dos arrays é a ordem do código do avatar e não pode ser rearranjada:
 * um avatar gravado é uma lista de ÍNDICES nestes arrays. Acrescentar peça no
 * FIM é seguro; inserir no meio troca o cabelo de todo mundo que já salvou.
 */

/** Linha (0–15) → 16 caracteres. */
export type Camada = Record<number, string>;

/** A cabeça e o pescoço. Vai em todo avatar, antes de qualquer peça de rosto. */
export const BASE: Camada = {
	2: '    ssssssss    ',
	3: '   ssssssssss   ',
	4: '   ssssssssss   ',
	5: '   ssssssssss   ',
	6: '   ssssssssss   ',
	7: '   ssssssssss   ',
	8: '   ssssssssss   ',
	9: '    ssssssss    ',
	10: '     ssssss     ',
	11: '      SSSS      '
};

export const ORELHAS: Camada = { 6: '  S          S  ' };

/** 16 cortes. Os nomes estão em `catalogo.ts`, na mesma ordem. */
export const CABELOS: readonly Camada[] = [
	{ 1: '    hhhhhhhh    ', 2: '   hhhhhhhhhh   ', 3: '   hh      hh   ', 4: '   h        h   ' },
	{ 1: '    hhhhhhhh    ', 2: '   hhhhhhhhhh   ', 3: '   hhhhhhhhhh   ', 4: '   hh      hh   ' },
	{
		1: '    hhhhhhhh    ',
		2: '   hhhhhhhhhh   ',
		3: '  hhh      hhh  ',
		4: '  hh        hh  ',
		5: '  hh        hh  ',
		6: '  hh        hh  ',
		7: '  hh        hh  ',
		8: '  hh        hh  ',
		9: '  hhh      hhh  ',
		10: '  hhh      hhh  ',
		11: '  hh        hh  ',
		12: '  h          h  '
	},
	{
		0: '   hhhhhhhhhh   ',
		1: '  hhhhhhhhhhhh  ',
		2: ' hhhhhhhhhhhhhh ',
		3: ' hhh        hhh ',
		4: ' hhh        hhh ',
		5: '  hh        hh  '
	},
	{
		0: '      hhhh      ',
		1: '    hhhhhhhh    ',
		2: '   hhhhhhhhhh   ',
		3: '   hh      hh   ',
		4: '   h        h   '
	},
	{
		1: '    hhhhhhhh    ',
		2: '   hhhhhhhhhh   ',
		3: '  hhh      hhh  ',
		4: ' hHh        hHh ',
		5: ' hHh        hHh ',
		6: ' hh          hh '
	},
	{
		1: '    hhhhhhhh    ',
		2: '   hhhhhhhhhh   ',
		3: '   hh      hhh  ',
		4: '   h        hHh ',
		5: '             hHh',
		6: '             hHh',
		7: '              hh'
	},
	{
		1: '    hhhhhhhh    ',
		2: '   hhhhhhhhhh   ',
		3: '  hhh      hhh  ',
		4: '  hHh      hHh  ',
		5: '  hhh      hhh  ',
		6: '  hHh      hHh  ',
		7: '  hhh      hhh  ',
		8: '  hHh      hHh  ',
		9: '  hh        hh  '
	},
	{ 0: '   h  h  h  h   ', 1: '   hhhhhhhhhh   ', 2: '   hhhhhhhhhh   ', 3: '   hh      hh   ' },
	{ 3: '   hh      hh   ', 4: '   h        h   ' },
	{ 1: '    HHHHHHHH    ', 2: '   HHHHHHHHHH   ', 3: '   HH      HH   ' },
	{
		1: '    hhhhhhhh    ',
		2: '   hhhhhhhhhh   ',
		3: '  hhh      hhh  ',
		4: '  hh        hh  ',
		5: '  hh        hh  ',
		6: '  hh        hh  ',
		7: '  hh        hh  ',
		8: '  hh        hh  ',
		9: '  hhh      hhh  ',
		10: '  hhhh    hhhh  ',
		11: '  hhhhhhhhhhhh  ',
		12: '   hhhhhhhhhh   '
	},
	{ 0: '      hhhh      ', 1: '      hhhh      ', 2: '   HHhhhhhhHH   ', 3: '   HH      HH   ' },
	{
		1: '    hhhhhhhh    ',
		2: '   hhhhhhhhhh   ',
		3: '  hhh      hhh  ',
		4: ' hh          hh ',
		5: ' hH          Hh ',
		6: ' hh          hh ',
		7: ' hH          Hh ',
		8: '  h          h  '
	},
	{
		0: '      hhhh      ',
		1: '    hhhhhhhh    ',
		2: '   hhhhhhhhhh   ',
		3: '   HHHHHHHHHH   ',
		4: '   hh      hh   '
	},
	{ 1: '    hhhhhhhh    ', 2: '   hhhhhhhhhh   ', 3: '   hhhhh   hh   ', 4: '   hhh      h   ' }
];

/** 8 expressões. A inteira cabe em dois ou quatro pixels. */
export const OLHOS: readonly Camada[] = [
	{ 6: '     ep  pe     ' },
	{ 5: '     ee  ee     ', 6: '     ep  pe     ' },
	{ 6: '     pp  pp     ' },
	{ 5: '     SS  SS     ', 6: '     ep  pe     ' },
	{ 5: '     ee  ee     ', 6: '     pp  pp     ' },
	{ 6: '     pe  pe     ' },
	{ 4: '    bb    bb    ', 5: '     bb  bb     ', 6: '     ep  pe     ' },
	{ 5: '    t t  t t    ', 6: '    ttt  ttt    ', 7: '     t    t     ' }
];

/** 7 bocas, contando a de ficar sem nenhuma. */
export const BOCAS: readonly Camada[] = [
	{ 8: '       mm       ' },
	{ 8: '      mmmm      ', 9: '       mm       ' },
	{ 8: '      mmmm      ' },
	{ 8: '        mm      ' },
	{ 7: '       SS       ', 8: '       mm       ' },
	{ 8: '      mmmm      ', 9: '      wwww      ' },
	{}
];

/** 6 opções. A cor é a mesma do cabelo, como na vida. */
export const BARBAS: readonly Camada[] = [
	{},
	{ 7: '      HHHH      ' },
	{ 7: '      HHHH      ', 9: '      bbbb      ' },
	{ 7: '   b        b   ', 8: '   bb      bb   ', 9: '    bbbbbbbb    ', 10: '     bbbbbb     ' },
	{ 8: '   HH      HH   ', 9: '    HHHHHHHH    ' },
	{
		6: '   bb      bb   ',
		7: '   bb      bb   ',
		8: '   bbb    bbb   ',
		9: '   bbbb  bbbb   ',
		10: '    bb    bb    ',
		11: '     b    b     '
	}
];

export const OCULOS: readonly Camada[] = [
	{},
	{ 5: '    gggggggg    ', 6: '    g  gg  g    ', 7: '    gggggggg    ' },
	{ 5: '   gggg  gggg   ', 6: '   g  gggg  g   ', 7: '   gggg  gggg   ' },
	{ 4: '   gggggggggg   ', 5: '  gwggggggwggg  ', 6: '  ggggg  ggggg  ', 7: '   gggg  gggg   ' },
	{ 5: '  gggggggggggg  ', 6: '  gwgggg  gggg  ' },
	{ 5: '        gggg    ', 6: '        g  g    ', 7: '        gggg    ' }
];

/** Bochecha rosada ou sardas. Some nos tamanhos pequenos, e é para ser assim. */
export const DETALHES: readonly Camada[] = [
	{},
	{ 7: '    B      B    ' },
	{ 7: '   BB      BB   ' }
];

/** 16 peças. Elas mudam a gola e o peito, e acompanham a pose. */
export const ROUPAS: readonly Camada[] = [
	{ 12: '      CCCC      ' },
	{ 13: '  CCCCCCCCCCCC  ', 15: ' CCCCCCCCCCCCCC ' },
	{ 11: '     cccccc     ', 12: '    CCCCCCCC    ' },
	{ 12: '      wwww      ', 13: '     CwwwwC     ', 14: '     Cw  wC     ' },
	{
		12: '      wwww      ',
		13: '     CttttC     ',
		14: '      tttt      ',
		15: '      tttt      '
	},
	{ 12: '     cccccc     ', 13: '     w    w     ' },
	{ 12: '   ssssssssss   ', 13: '  ss cccccc ss  ' },
	{ 12: '     wwwwww     ', 13: '    CwwwwwwC    ', 14: '    Cwwwwww C   ' },
	{
		12: '     cccccc     ',
		13: '    CC    CC    ',
		14: '     CC  CC     ',
		15: '      CCCC      '
	},
	{
		12: '     CCCCCC     ',
		13: '   CCCCCCCCCC   ',
		14: '   C  CCCC  C   ',
		15: '   CCC    CCC   '
	},
	{
		12: '      cccc      ',
		13: '    CCccccCC    ',
		14: '      wwww      ',
		15: '     C    C     '
	},
	{ 12: '      CCCC      ', 14: '      wwww      ', 15: '      wwww      ' },
	{ 12: '   CCCCCCCCCC   ', 13: '  CC        CC  ' },
	{ 12: '     cccccc     ', 13: '     C    C     ', 14: '      CCCC      ' },
	{
		12: '     wcccw      ',
		13: '    wwcccww     ',
		14: '    CCCCCCCC    ',
		15: '     wccccw     '
	},
	{ 12: '   ssssssssss   ', 13: '  ssssssssssss  ', 14: ' ssSSssssssSSss ', 15: ' ssssssssssssss ' }
];

/**
 * 7 posturas. Cada uma é [silhueta, linha do TOPO dos ombros] — o topo é o que
 * desloca a roupa junto com a pose: sem ele a camiseta fica flutuando acima do
 * ombro em "ombros à mostra".
 */
export const POSES: readonly (readonly [Camada, number])[] = [
	[
		{
			12: '   cccccccccc   ',
			13: '  cccccccccccc  ',
			14: ' cccccccccccccc ',
			15: ' cccccccccccccc '
		},
		12
	],
	[
		{
			12: '  ccccccccc     ',
			13: ' cccccccccccc   ',
			14: ' cccccccccccccc ',
			15: ' cccccccccccccc '
		},
		12
	],
	[
		{
			12: '     ccccccccc  ',
			13: '    cccccccccc  ',
			14: '   ccccccccccc  ',
			15: '   ccccccccccc  '
		},
		12
	],
	[
		{
			4: 'nnn             ',
			5: 'nnn             ',
			6: 'cc              ',
			7: ' cc             ',
			8: ' cc             ',
			9: ' cc             ',
			10: ' cc             ',
			11: ' cc             ',
			12: ' cccccccccccc   ',
			13: '  cccccccccccc  ',
			14: ' cccccccccccccc ',
			15: ' cccccccccccccc '
		},
		12
	],
	[
		{
			12: '   cccccccccc   ',
			13: '  cccccccccccc  ',
			14: ' nnCCCCCCCCCCnn ',
			15: ' cccccccccccccc '
		},
		12
	],
	[
		{
			12: '   ssssssssss   ',
			13: '   cccccccccc   ',
			14: '  cccccccccccc  ',
			15: ' cccccccccccccc '
		},
		13
	],
	[
		{
			4: '             nnn',
			5: '             nnn',
			6: '              cc',
			7: '             cc ',
			8: '             cc ',
			9: '             cc ',
			10: '             cc ',
			11: '             cc ',
			12: '   cccccccccccc ',
			13: '  cccccccccccc  ',
			14: ' cccccccccccccc ',
			15: ' cccccccccccccc '
		},
		12
	]
];

/**
 * 13 peças, do brinco à espada. Dá para usar até TRÊS ao mesmo tempo — por isso
 * o código tem três casas de acessório (13, 16 e 17). Tudo que vai na cabeça
 * cobre parte do cabelo, porque estas peças são pintadas depois dele.
 */
export const ACESSORIOS: readonly Camada[] = [
	{},
	{ 9: '   a        a   ' },
	{ 1: '    kkkkkkkk    ', 2: '   kkkkkkkkkk   ', 3: '   kkkkkkkkkkKK ' },
	{ 1: '    kkkkkkkk    ', 2: '   kkkkkkkkkk   ', 3: '   KKKKKKKKKK   ' },
	{
		2: '    ffffffff    ',
		3: '   f        f   ',
		4: '  ff        ff  ',
		5: '  ff        ff  ',
		6: '  ff        ff  '
	},
	{ 3: '   aaaaaaaaaa   ' },
	{
		2: '   kkkkkkkkkk   ',
		3: '   kkkkkkkkkk   ',
		4: '   kkkkkkkkkk   ',
		7: '   kkkkkkkkkk   ',
		8: '   kkkkkkkkkk   ',
		9: '    kkkkkkkk    ',
		10: '     kkkkkk     '
	},
	{ 3: '  kkkkkkkkkkkk  ', 4: '  KK      KKKKk ', 5: '             kk ' },
	{ 0: '   k  k  k  k   ', 1: '   kkkkkkkkkk   ', 2: '   KKKKKKKKKK   ' },
	{
		1: '   kkkkkkkkkk   ',
		2: '  kkkkkkkkkkkk  ',
		3: '  kkkkkkkkkkkk  ',
		4: '  kk        kk  ',
		5: '  kK        Kk  ',
		6: '  kk        kk  ',
		7: '  kkk      kkk  ',
		8: '  kkkk    kkkk  '
	},
	{ 4: '  kkkkkkkkkkkk  ', 5: '  kKKKKKKKKKKk  ', 6: '  kkKKKKKKKKkk  ' },
	{ 1: '   kkkkkkkkkk   ', 2: '  kk KKKKKK kk  ', 3: '  kkkkkkkkkkkk  ', 4: '  kk        kk  ' },
	{
		6: '               Z',
		7: '              z ',
		8: '             z  ',
		9: '            z   ',
		10: '           z    ',
		11: '   zz     z     ',
		12: '  kk            ',
		13: ' aa             ',
		14: 'K               '
	}
];
