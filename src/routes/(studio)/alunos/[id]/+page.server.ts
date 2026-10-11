import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { alunos } from '$lib/server/db/repos/classrooms';
import { etiquetaDaTurma } from '$lib/server/turmas/etiqueta';
import { labelForTag } from '$lib/kernel/language/profiles';

/**
 * O aluno e o histórico dele. Toda lista de aluno do Studio leva para cá —
 * clicar num nome tem que responder "como este aluno está indo", que é a
 * pergunta que o professor faz olhando a chamada.
 *
 * **Aluno não é conta.** Esta tela é do PROFESSOR, atrás do guard, e é dele
 * o escopo: o repositório só devolve aluno com o `teacherId` dele. O aluno
 * nunca vê esta página — ele não tem login.
 */
function haQuantoTempo(data: Date): string {
	const min = Math.round((Date.now() - data.getTime()) / 60000);
	if (min < 60) return 'há minutos';
	const horas = Math.round(min / 60);
	if (horas < 24) return `há ${horas}h`;
	const dias = Math.round(horas / 24);
	if (dias === 1) return 'ontem';
	if (dias < 7) return `há ${dias} dias`;
	const semanas = Math.round(dias / 7);
	return semanas === 1 ? 'há 1 semana' : `há ${semanas} semanas`;
}

function iniciais(nome: string): string {
	return (
		nome
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((parte) => parte[0]?.toUpperCase())
			.join('') || '?'
	);
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const teacher = requireTeacher(locals);
	const aluno = await alunos(teacher).historico(params.id);
	// Não distinga "não existe" de "não é seu" (auth.md).
	if (!aluno) error(404, 'Aluno não encontrado');

	const tentativas = aluno.attempts.map((tentativa) => {
		const versao = tentativa.publication.activityVersion;
		const placar = { correct: 0, partial: 0, incorrect: 0 };
		for (const resposta of tentativa.items) {
			if (resposta.score >= 1) placar.correct++;
			else if (resposta.score > 0) placar.partial++;
			else placar.incorrect++;
		}
		const respondidas = tentativa.items.length;

		return {
			id: tentativa.id,
			activityId: versao.activity.id,
			activityTitle: versao.activity.title,
			language: labelForTag(versao.activity.targetLang),
			when: haQuantoTempo(tentativa.startedAt),
			finished: !!tentativa.finishedAt,
			answered: respondidas,
			itemCount: versao._count.items,
			// O nome COM QUE ELE RESPONDEU. Normalmente é o do cadastro, mas uma
			// tentativa vinculada depois pode ter outro — e esconder isso faria o
			// professor duvidar da lista em vez de entender de onde ela veio.
			name: tentativa.name,
			score: placar,
			// Média sobre o que foi RESPONDIDO, não sobre a atividade inteira:
			// dizer 20% para quem parou na segunda questão seria mentira.
			percent: respondidas > 0 ? Math.round((placar.correct / respondidas) * 100) : null
		};
	});

	const terminadas = tentativas.filter((t) => t.finished);
	const somaAcerto = terminadas.reduce((total, t) => total + (t.percent ?? 0), 0);

	return {
		student: {
			id: aluno.id,
			name: aluno.name,
			initials: iniciais(aluno.name),
			avatar: aluno.account?.avatar ?? null,
			email: aluno.email,
			createdAt: aluno.createdAt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }),
			// O último convite dele: para reenviar só para ele, e para dizer aqui
			// — não só na turma — que o e-mail voltou.
			inviteId: aluno.invites[0]?.id ?? null,
			conviteVoltou: !!aluno.invites[0]?.bouncedAt,
			// A conta do aluno, quando ele ligou as duas coisas abrindo o convite
			// logado. O e-mail dela pode ser outro: o professor digitou um, o aluno
			// cadastrou outro, e os dois são verdade.
			account: aluno.account ? { name: aluno.account.name, email: aluno.account.email } : null
		},
		classroom: aluno.classroom
			? {
					id: aluno.classroom.id,
					name: aluno.classroom.name,
					badge: etiquetaDaTurma(aluno.classroom.name),
					color: aluno.classroom.color
				}
			: null,
		totals: {
			attempts: tentativas.length,
			finished: terminadas.length,
			average: terminadas.length > 0 ? Math.round(somaAcerto / terminadas.length) : null
		},
		attempts: tentativas
	};
};
