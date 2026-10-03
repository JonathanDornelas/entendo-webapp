import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { atividades } from '$lib/server/db/repos/activities';
import { playerRepo } from '$lib/server/db/repos/player';
import { buildRuntimeItem, itemAudioHashes } from '$lib/server/player/runtime';

/**
 * "Pré-visualizar tudo" da etapa 4. O professor vê o rascunho inteiro como o
 * aluno vai ver — e é literal: cada item passa por `buildRuntimeItem`, a
 * MESMA porta do Player (regra inviolável nº 1). Se o gabarito aparecesse
 * aqui, estaria vazando de verdade; por isso a prévia não pode ler o payload
 * de autoria nem "esconder" campos na tela.
 *
 * Não existe `Attempt`: nada é gravado, nada é corrigido. A seed é fixa para
 * o professor ver sempre o mesmo embaralhamento entre um F5 e outro.
 */
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const teacher = requireTeacher(locals);
	const activity = await atividades(teacher).byId(params.id);
	if (!activity) error(404, 'Atividade não encontrada');

	const [draft, published] = await Promise.all([
		atividades(teacher).draft(params.id),
		atividades(teacher).published(params.id)
	]);

	const versao = draft ?? published;
	// Item descartado não entra: a prévia mostra o que vai ao ar.
	const rows = (versao?.items ?? []).filter((item) => !item.discarded);

	const hashes = rows.flatMap((item) => itemAudioHashes(item, activity.targetLang));
	const assets = await playerRepo.mediaUrls(teacher.id, hashes);
	const urlByHash = new Map(assets.map((asset) => [asset.hash, asset.url]));

	// `buildRuntimeItem` valida o payload contra o `authoringSchema` e LANÇA
	// quando ele não bate — o que é o certo, mas aqui derrubaria a prévia
	// inteira por causa de um item só. O professor precisa ver qual é.
	const items = rows.map((row, index) => {
		try {
			return {
				index: index + 1,
				id: row.id,
				runtime: buildRuntimeItem(row, `previa:${versao?.id ?? activity.id}`, urlByHash),
				incompleto: false
			};
		} catch {
			return { index: index + 1, id: row.id, runtime: null, incompleto: true };
		}
	});

	return {
		activity: { id: activity.id, title: activity.title },
		rascunho: !!draft,
		// De onde a prévia foi aberta, para o "Fechar" voltar para lá. É um
		// TOKEN de uma lista fechada, nunca uma URL vinda do cliente: `?voltar=`
		// com endereço livre é redirecionamento aberto de manual.
		voltarPara:
			url.searchParams.get('voltar') === 'detalhe' ? ('detalhe' as const) : ('publicar' as const),
		items
	};
};
