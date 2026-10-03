import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { atividades } from '$lib/server/db/repos/activities';
import { itemSkills, promptInstruction } from '$lib/server/player/runtime';
import { readableAnswerKey } from '$lib/server/studio/answer-key';
import { gradingSchema, interactionSchema, promptSchema } from '$lib/kernel/item';
import { getProfile } from '$lib/kernel/language/profiles';
import { normalize } from '$lib/kernel/language/normalize';
import type { GradingMode, InteractionKind, Skill } from '$lib/kernel/interactions/types';

const SKILL_LABEL: Record<Skill, string> = {
	listening: 'Listening',
	speaking: 'Speaking',
	reading: 'Reading',
	writing: 'Writing'
};

const GRADING_LABEL: Record<GradingMode, string> = {
	exact: 'exata',
	tolerant: 'tolerante',
	sequence: 'sequência',
	set: 'conjunto',
	asr: 'ASR',
	rubric: 'rubrica'
};

/**
 * Editor de item — nível 3 (kernel.md). O gabarito vem para esta tela porque
 * ela é do PROFESSOR e roda atrás do guard; o que nunca sai daqui é o mesmo
 * payload indo para o Player (regra inviolável nº 1) — a prévia ao lado
 * renderiza `toRuntime()`, não isto.
 *
 * PENDÊNCIA: o formulário ainda não é DERIVADO do `authoringSchema` campo a
 * campo (kernel.md "Nível 3"); hoje ele cobre o caso de texto/lacuna, que é
 * o que os geradores de `SentencePair` produzem. Ver paginas.md "O que falta".
 * Por isso `editavel`: nas outras interações o professor salva enunciado,
 * prompt e correção, e o gabarito segue como o gerador montou.
 */

/** As interações cujo gabarito é uma lista de textos — as que este formulário sabe montar. */
const EDITAVEIS: InteractionKind[] = ['type', 'cloze'];
export const load: PageServerLoad = async ({ locals, params }) => {
	const teacher = requireTeacher(locals);
	const activity = await atividades(teacher).byId(params.id);
	if (!activity) error(404, 'Atividade não encontrada');

	const draft = await atividades(teacher).draft(params.id);
	const index = draft?.items.findIndex((item) => item.id === params.itemId) ?? -1;
	const row = index >= 0 ? draft?.items[index] : undefined;

	// `!draft` está junto de `!row` porque um implica o outro — e é o que deixa
	// o TypeScript saber que o rascunho existe daqui para baixo.
	if (!draft || !row) {
		// O id pode ser de um item PUBLICADO: a tela de detalhes lista a versão
		// no ar, e publicar apaga o rascunho — clicar numa questão de lá dava
		// 404. Editar um item publicado é editar a cópia editável dele, então
		// aqui a gente abre essa cópia e manda o professor para o item
		// equivalente. `draftFromPublished` clona na mesma ORDEM, que é o que
		// liga um id ao outro (os ids são novos, as posições não mudam).
		const published = await atividades(teacher).published(params.id);
		const posicao = published?.items.findIndex((item) => item.id === params.itemId) ?? -1;
		if (posicao >= 0) {
			const editavel = await atividades(teacher).draftFromPublished(params.id);
			const equivalente = editavel?.items[posicao];
			if (equivalente) {
				redirect(
					303,
					resolve('/(studio)/atividades/[id]/itens/[itemId]', {
						id: params.id,
						itemId: equivalente.id
					})
				);
			}
		}
		error(404, 'Item não encontrado nesta atividade');
	}

	const prompt = promptSchema.parse(row.prompt);
	const interaction = interactionSchema.parse(row.interaction);
	const grading = gradingSchema.parse(row.grading);

	// Cada interação guarda o gabarito numa forma diferente; o professor vê
	// todas do mesmo jeito (resposta principal + variantes).
	const { answer, variants } = readableAnswerKey(interaction.type, interaction.payload);
	const masked = (interaction.payload as { masked?: unknown }).masked;

	// Variante proposta ao professor: sai de uma transformação do
	// LanguageProfile, nunca de conhecimento de língua embutido (kernel.md
	// "Respostas aceitas"). Ele aprova com um clique.
	const profile = getProfile(activity.targetLang);
	const normalized = answer ? normalize(answer, profile) : '';
	const suggestion =
		normalized && normalized !== answer && !variants.includes(normalized) ? normalized : '';

	return {
		activity: {
			id: activity.id,
			dir: getProfile(activity.targetLang).direction
		},
		itemCount: draft.items.length,
		suggestion,
		// "Item anterior"/"Próximo item" andam pelo rascunho na ordem dele.
		// `null` na ponta é o que desabilita o botão — não escondê-lo, senão a
		// barra do editor muda de largura entre um item e outro.
		prevId: draft.items[index - 1]?.id ?? null,
		nextId: draft.items[index + 1]?.id ?? null,
		// Normalização é do LanguageProfile, nunca do item (regra do CLAUDE.md:
		// nenhuma regra de língua fora dele). Os toggles mostram o que o par de
		// idiomas já decide — não são um ajuste por exercício.
		normalizacao: {
			acentos: profile.diacritics === 'tolerant',
			caixa: !profile.caseSensitive,
			pontuacao: profile.normalizers.includes('strip-punct')
		},
		item: {
			index: index + 1,
			id: row.id,
			editavel: EDITAVEIS.includes(interaction.type),
			// O enunciado por extenso — a chave crua ("fill-the-blank") é
			// detalhe do kernel, não texto de tela.
			prompt: promptInstruction(prompt),
			promptKind: prompt.kind,
			instructionKey: prompt.instructionKey ?? '',
			target: prompt.text ?? '',
			masked: typeof masked === 'string' ? masked : '',
			answer,
			variants,
			interaction: interaction.type,
			gradingMode: grading.mode,
			grading: GRADING_LABEL[grading.mode],
			skill: SKILL_LABEL[itemSkills(row)[0] ?? 'reading']
		}
	};
};
