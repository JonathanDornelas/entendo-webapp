import { z } from 'zod';
import type { Skill } from './types';

/**
 * As quatro habilidades como schema, para validar o que chega de fora (o
 * filtro que o professor escolhe na etapa 1, guardado em `Activity.skills`).
 *
 * Fica separado de `types.ts` porque lá é só tipo — este arquivo é a fronteira
 * de validação: coluna do Postgres e campo de formulário são `unknown` de
 * verdade, e "nada de `any`" (regra nº 9) significa passar por Zod, nunca por
 * um cast.
 */
export const skills = ['listening', 'speaking', 'reading', 'writing'] as const;

export const skillSchema = z.enum(skills);

/** Rótulo em português — a tela nunca mostra a chave técnica. */
export const skillLabels: Record<Skill, string> = {
	listening: 'Escuta',
	speaking: 'Fala',
	reading: 'Leitura',
	writing: 'Escrita'
};
