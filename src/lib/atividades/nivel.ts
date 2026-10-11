import { z } from 'zod';

/**
 * O NÍVEL de uma atividade — o "sistema de dificuldade" que o dono do
 * repositório escolheu: um RÓTULO para organizar, filtrar e o aluno ver, que
 * NÃO muda os exercícios gerados (docs/adr-004-modulos-e-nivel.md).
 *
 * A escala é a do CEFR (Quadro Europeu Comum), que vale para QUALQUER idioma —
 * por isso o sistema continua agnóstico (CLAUDE.md): uma escala própria de um
 * idioma (JLPT, HSK) seria regra de língua fora do `LanguageProfile`.
 *
 * Trocar a escala é editar esta lista. Mudar um `id` pede migração dos dados
 * já gravados em `Activity.level`; mudar só o `nome` não pede nada.
 *
 * Isomórfico e fora do `kernel/`: o kernel modela exercício, e nível é
 * metadado da atividade.
 */
export const NIVEIS = [
	{ id: 'A1', nome: 'Iniciante' },
	{ id: 'A2', nome: 'Básico' },
	{ id: 'B1', nome: 'Intermediário' },
	{ id: 'B2', nome: 'Intermediário superior' },
	{ id: 'C1', nome: 'Avançado' },
	{ id: 'C2', nome: 'Proficiente' }
] as const;

export type NivelId = (typeof NIVEIS)[number]['id'];

export const nivelSchema = z.enum(NIVEIS.map((n) => n.id) as [NivelId, ...NivelId[]]);

/** Valor do banco (texto livre) para nível conhecido — o que não está na escala vira "sem nível". */
export function nivelOuNulo(valor: unknown): NivelId | null {
	const lido = nivelSchema.safeParse(valor);
	return lido.success ? lido.data : null;
}

/** "B1 · Intermediário" — como a tela escreve. */
export function rotuloDoNivel(id: NivelId): string {
	const nivel = NIVEIS.find((n) => n.id === id);
	return nivel ? `${nivel.id} · ${nivel.nome}` : id;
}
