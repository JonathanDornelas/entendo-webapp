import { z } from 'zod';
import { CASAS, LIMITES, normalizar } from './montar';

/**
 * O código do avatar como ele entra pela rede. Separado de `montar.ts` para
 * aquele arquivo continuar sem dependência nenhuma — ele roda no Player, onde
 * cada import conta (design-system.md "Dois contextos, dois orçamentos").
 *
 * **Valida a FORMA e normaliza.** `montarAvatar` já aguenta entrada podre
 * (índice além do fim dá a volta), mas aguentar não é motivo para GRAVAR
 * `99-99-99`: o que vai para o banco é sempre a forma canônica de dezoito
 * casas dentro dos limites, senão duas linhas com o mesmo avatar ficam com
 * texto diferente e nada mais consegue comparar as duas.
 */
export const codigoDeAvatarSchema = z
	.string()
	.trim()
	.max(80, 'código de avatar longo demais')
	.regex(
		/^\d{1,3}(-\d{1,3}){0,17}$/,
		'o código do avatar é uma lista de números separados por hífen'
	)
	.transform(normalizar)
	.refine(
		(codigo) => {
			const casas = codigo.split('-').map(Number);
			return (
				casas.length === CASAS &&
				casas.every((v, i) => Number.isInteger(v) && v >= 0 && v < (LIMITES[i] ?? LIMITES[13]!))
			);
		},
		{ message: 'peça de avatar que não existe' }
	);
