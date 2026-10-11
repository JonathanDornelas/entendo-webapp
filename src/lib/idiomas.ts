import { z } from 'zod';
import { languageLabels } from '$lib/kernel/language/profiles';

/**
 * As TAGS DE IDIOMA de atividade, turma e material — o idioma que o aluno
 * APRENDE (o alvo), uma por item. Isomórfico: o servidor valida, a tela desenha
 * (`IdiomaTag.svelte`) e filtra (`FiltroIdioma.svelte`).
 *
 * A fonte é `languageLabels` (kernel/language/profiles): a tela nunca conhece
 * uma tag que não tenha `LanguageProfile`, e um idioma novo aparece aqui sem
 * editar nada — o sistema continua agnóstico de idioma.
 */

export type Idioma = { tag: string; rotulo: string; codigo: string };

/** "en-US" → "EN". O rótulo diz a região quando ela importa ("Inglês (EUA)"). */
export function codigoDoIdioma(tag: string): string {
	return (tag.split('-')[0] ?? tag).toUpperCase();
}

/** Na ordem de `languageLabels` — a mesma dos `<select>` de idioma do produto. */
export const IDIOMAS: Idioma[] = Object.entries(languageLabels).map(([rotulo, tag]) => ({
	tag,
	rotulo,
	codigo: codigoDoIdioma(tag)
}));

const PORTAG = new Map(IDIOMAS.map((i) => [i.tag, i]));

export function ehIdioma(valor: unknown): valor is string {
	return typeof valor === 'string' && PORTAG.has(valor);
}

/** A tag gravada que não é mais um idioma do produto conta como "sem idioma". */
export function idiomaOuNulo(valor: unknown): string | null {
	return ehIdioma(valor) ? valor : null;
}

export function idiomaDe(tag: string | null | undefined): Idioma | null {
	return tag ? (PORTAG.get(tag) ?? null) : null;
}

/** Campo de formulário: vazio é "sem idioma"; o que não é idioma do produto é recusado. */
export const campoIdioma = z
	.string()
	.optional()
	.transform((v) => (v ? v : null))
	.refine((v) => v === null || ehIdioma(v), 'Idioma inválido.');

/**
 * O valor de um filtro de idioma: `''` (todos), uma tag, ou `SEM_IDIOMA`.
 * Uma constante e não `null`, porque `<select>` só carrega texto.
 */
export const SEM_IDIOMA = 'sem';

/** Passa no filtro? */
export function casaComFiltro(tag: string | null, filtro: string): boolean {
	if (!filtro) return true;
	if (filtro === SEM_IDIOMA) return tag === null;
	return tag === filtro;
}

/**
 * Os idiomas PRESENTES numa lista, na ordem do produto, e se há algum item sem
 * idioma — o que o filtro oferece. Oferecer os dez sempre seria filtro que
 * devolve lista vazia.
 */
export function idiomasPresentes(tags: (string | null | undefined)[]): {
	idiomas: Idioma[];
	temSemIdioma: boolean;
} {
	const vistos = new Set(tags.filter((t): t is string => !!t && PORTAG.has(t)));
	return {
		idiomas: IDIOMAS.filter((i) => vistos.has(i.tag)),
		temSemIdioma: tags.some((t) => !t || !PORTAG.has(t))
	};
}

/** O idioma mais frequente numa lista — o padrão do seletor da biblioteca. */
export function idiomaMaisFrequente(tags: (string | null | undefined)[]): string | null {
	const conta = new Map<string, number>();
	for (const t of tags) if (t && PORTAG.has(t)) conta.set(t, (conta.get(t) ?? 0) + 1);
	let melhor: string | null = null;
	for (const [t, n] of conta) if (!melhor || n > (conta.get(melhor) ?? 0)) melhor = t;
	return melhor;
}

/**
 * Uma lista de tags limpa: só idiomas do produto, sem repetição, na ordem em que
 * chegaram e com teto (o perfil do professor — `repos/teachers.ts`). Tag que
 * deixou de existir some em vez de virar padrão de atividade.
 */
export function idiomasValidos(tags: readonly unknown[], teto = IDIOMAS.length): string[] {
	const vistos = new Set<string>();
	for (const t of tags) if (ehIdioma(t)) vistos.add(t);
	return [...vistos].slice(0, teto);
}
