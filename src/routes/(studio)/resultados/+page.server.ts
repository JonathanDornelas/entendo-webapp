import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { listaDeResultados } from '$lib/server/resultados/lista';

/**
 * A lista de atividades publicadas com a distribuição de acerto de cada uma —
 * uma TABELA (paginas.md "Resultados"): tentativas, acerto e a última tentativa
 * lado a lado, com a tag de idioma para agrupar. Busca, ordem e agrupamento
 * são de TELA: a lista é do professor e já vem inteira.
 *
 * A conta mora em `listaDeResultados`, que o início também usa — o acerto
 * médio das duas telas é o mesmo número.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const teacher = requireTeacher(locals);
	const { publishedCount, totalAttempts, averageCorrect, activities } = await listaDeResultados(
		teacher.id
	);
	return { publishedCount, totalAttempts, averageCorrect, activities };
};
