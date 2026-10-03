import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { playerRepo } from '$lib/server/db/repos/player';
import { itemAudioHashes, itemSkills } from '$lib/server/player/runtime';
import { enfileirarAudioFaltante } from '$lib/server/tts/enfileirar';
import { convitePorToken } from '$lib/server/db/repos/deliveries';
import { labelForTag } from '$lib/kernel/language/profiles';
import type { Skill } from '$lib/kernel/interactions/types';

/** Habilidades como o ALUNO lê — não é o rótulo técnico do Studio. */
const SKILL_LABEL: Record<Skill, string> = {
	listening: 'Escuta',
	speaking: 'Fala',
	reading: 'Leitura',
	writing: 'Escrita'
};

/**
 * Entrada do aluno. Nada de sessão aqui — o Player é anônimo por design
 * (server.md "A fronteira de segurança do Player"). Esta tela não devolve
 * nenhum item: só o suficiente para o aluno decidir começar.
 */
export const load: PageServerLoad = async ({ params, cookies, locals }) => {
	const publication = await playerRepo.publicationBySlug(params.slug);
	if (!publication) error(404, { message: 'Link não encontrado', reason: 'notFound' });

	const { activityVersion } = publication;
	const itemCount = activityVersion.items.length;

	// O link só fica ativo quando todo o áudio existe (server.md "TTS").
	const hashes = activityVersion.items.flatMap((item) =>
		itemAudioHashes(item, activityVersion.activity.targetLang)
	);
	const audio = await playerRepo.audioReady(activityVersion.activity.teacherId, hashes);
	if (audio.done < audio.total) {
		// **Falta áudio: pode ser a primeira publicação ainda sintetizando, ou o
		// prazo de 10 dias que venceu.** Publicar é o único momento que enfileira
		// TTS, então sem esta reposição a atividade de duas semanas atrás ficaria
		// travada aqui para sempre — o `MediaAsset` expirado nem conta como
		// pronto, e o objeto já não está no bucket.
		//
		// Enfileirar de uma tela pública é seguro porque o helper é idempotente
		// nas duas pontas: pula o que tem áudio válido e pula o que já está na
		// fila. Trinta alunos abrindo o link ao mesmo tempo não viram trinta
		// jobs.
		await enfileirarAudioFaltante({
			teacherId: activityVersion.activity.teacherId,
			targetTag: activityVersion.activity.targetLang,
			items: activityVersion.items
		});
		error(503, { message: 'Áudio ainda sendo gerado', reason: 'audioPending' });
	}

	// Quem chegou pelo link pessoal já está identificado: a tela cumprimenta
	// em vez de pedir o nome. Quem chegou pelo link aberto continua digitando.
	const studentId = cookies.get(`entendo_aluno_${params.slug}`);
	const student = studentId ? await convitePorToken.studentById(studentId) : null;

	const anonId = cookies.get('entendo_anon');
	const previous = anonId ? await playerRepo.resumableAttempt(publication.id, anonId) : null;

	// Já respondeu esta atividade? A entrada mostra o RESULTADO em vez de pedir
	// tudo de novo. Só quando não há retomada pendente: quem parou no meio
	// quer terminar, não rever o que fez da outra vez.
	const concluida = previous
		? null
		: await playerRepo.concludedAttempt(publication.id, {
				anonId,
				accountId: locals.aluno?.id
			});

	// As habilidades são DERIVADAS dos itens (kernel.md) — o professor não
	// marcou nenhuma. Aparecem aqui para o aluno saber que vai gravar voz, não
	// só clicar.
	const habilidades = [...new Set(activityVersion.items.flatMap((item) => itemSkills(item)))];
	const skills = habilidades.map((skill) => SKILL_LABEL[skill]);
	// Só faz sentido pedir autorização para guardar gravação se houver o que
	// gravar. Numa atividade de leitura a pergunta seria ruído — e pior: um
	// pedido de permissão sem motivo ensina a marcar sem ler.
	const temFala = habilidades.includes('speaking');

	const minutesPerItem = 0.5;
	return {
		activity: {
			title: activityVersion.activity.title,
			itemCount,
			minutes: Math.max(1, Math.round(itemCount * minutesPerItem)),
			targetLabel: labelForTag(activityVersion.activity.targetLang),
			skills,
			temFala
		},
		student: student ? { name: student.name } : null,
		// A conta do aluno, quando existe. É OFERTA, nunca exigência: a tela
		// cumprimenta quem está logado e mostra o convite para quem não está,
		// e os dois começam a atividade pelo mesmo botão.
		account: locals.aluno ? { name: locals.aluno.name } : null,
		// É informação de TELA, não uma tranca: a identidade aqui é um cookie de
		// aparelho. Bloquear no servidor deixaria sem recurso quem trocou de
		// celular ou limpou o navegador — e a atividade é do professor, que pode
		// pedir para refazer. O caminho de responder de novo segue existindo.
		concluida: concluida
			? {
					when: relativeTime(concluida.finishedAt ?? concluida.startedAt),
					respondidas: concluida.items.length,
					acertos: concluida.items.filter((linha) => linha.score >= 1).length,
					name: concluida.name
				}
			: null,
		resumable: previous
			? {
					name: previous.name,
					nextIndex: Math.min(previous.items.length + 1, itemCount),
					answered: previous.items.length,
					startedAgo: relativeTime(previous.startedAt)
				}
			: null
	};
};

function relativeTime(date: Date): string {
	const minutes = Math.round((Date.now() - date.getTime()) / 60000);
	if (minutes < 1) return 'agora mesmo';
	if (minutes < 60) return `há ${minutes} min`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `há ${hours} h`;
	return `há ${Math.round(hours / 24)} dias`;
}
