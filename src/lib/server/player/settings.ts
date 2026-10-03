import { z } from 'zod';

/**
 * `Publication.settings` é uma coluna `Json` — valide ao ler, sempre
 * (db.md "JSON no Postgres").
 *
 * Mora aqui, e não no `.remote.ts` do Player, porque um arquivo de remote
 * functions só pode exportar remote functions: qualquer outro export vira
 * erro de build no SvelteKit.
 */
export const publicationSettingsSchema = z.object({
	requireCode: z.boolean().default(false),
	code: z.string().nullable().default(null),
	showResult: z.boolean().default(true)
});

export type PublicationSettings = z.infer<typeof publicationSettingsSchema>;
