import type { ContentUnitData, ContentUnitKind } from './types';
import { contentUnitSchemas } from './types';

/**
 * `ContentUnit.data` é JSON no Postgres — nunca confie no tipo do Prisma,
 * valide com Zod ao ler (db.md "JSON no Postgres"). Lança se o dado gravado
 * não bate mais com o schema: é corrupção ou bug de gravação, não um caso a
 * tratar em silêncio.
 */
export function parseContentUnit<K extends ContentUnitKind>(
	kind: K,
	data: unknown
): ContentUnitData<K> {
	// O `as` existe porque o TS não estreita o índice genérico num Record
	// heterogêneo — o schema indexado é o certo em runtime, o compilador só
	// não consegue provar.
	return contentUnitSchemas[kind].parse(data) as ContentUnitData<K>;
}
