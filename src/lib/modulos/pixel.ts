/**
 * Pixel art como DADO, para o tema 8 bits do mapa do módulo
 * (docs/telas-modulos-aluno.md) — o mesmo molde de `$lib/avatar/`. Cada sprite
 * é uma grade de letras; cada letra vira um `path` de retângulos, desenhado com
 * `shape-rendering="crispEdges"` e cor por token. Nenhum arquivo de imagem.
 */

/** Os retângulos de uma letra da grade, juntando os vizinhos da mesma linha numa faixa. */
export function caminhoDaGrade(
	grade: string[],
	escala: number,
	ox: number,
	oy: number,
	letra: string
): string {
	let d = '';
	grade.forEach((linha, y) => {
		let x = 0;
		while (x < linha.length) {
			if (linha[x] !== letra) {
				x++;
				continue;
			}
			let w = 1;
			while (linha[x + w] === letra) w++;
			d += `M${ox + x * escala} ${oy + y * escala}h${w * escala}v${escala}h-${w * escala}z`;
			x += w;
		}
	});
	return d;
}

const icone = (grade: string[]) => caminhoDaGrade(grade, 1, 0, 0, '#');

/** Os ícones 7×7 do mapa (`viewBox="0 0 7 7"`). Cada estado de fase tem o seu: nunca só cor. */
export const ICONE_PIXEL = {
	bandeira: icone(['#......', '####...', '######.', '####...', '#......', '#......', '#......']),
	cadeado: icone(['..###..', '.#...#.', '.#...#.', '#######', '###.###', '###.###', '#######']),
	jogar: icone(['.#.....', '.###...', '.####..', '.#####.', '.####..', '.###...', '.#.....']),
	xis: icone(['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#']),
	estrela: icone(['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##']),
	calendario: icone(['#######', '#.....#', '#######', '#.#.#.#', '#######', '#.#.#.#', '#######']),
	olho: icone(['.......', '..###..', '.#...#.', '#..#..#', '.#...#.', '..###..', '.......'])
};
