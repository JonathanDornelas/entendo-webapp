import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { can } from '$lib/server/billing/entitlements';

/**
 * Conta E assinatura, numa tela só com duas abas. Precisa de loader próprio
 * mesmo sendo simples: o layout do Studio já publica uma chave `teacher`
 * (iniciais, nome, plano) com OUTRA forma, e sem este load a página receberia
 * aquela e mostraria o e-mail vazio.
 *
 * DTO explícito — nunca a entidade inteira do professor (auth.md
 * "Serialização"): `stripeCustomerId` fica aqui.
 */
type PlanStatus = 'active' | 'trial' | 'past_due' | 'pending' | 'canceled';

/**
 * O estado de cobrança que a TELA conhece. O do banco é o vocabulário do
 * provedor (`trialing`, `incomplete`, ...); a aba fala nos cinco estados que
 * têm desenho próprio. `null` — professor sem nenhum registro — é tratado
 * como trial, que é o estado de fábrica do cadastro (billing.md "Trial").
 */
function estadoDoPlano(status: string | null | undefined): PlanStatus {
	switch (status) {
		case 'active':
			return 'active';
		case 'past_due':
		case 'unpaid':
			return 'past_due';
		case 'incomplete':
		case 'pending':
			return 'pending';
		case 'canceled':
			return 'canceled';
		default:
			return 'trial';
	}
}

function dataPorExtenso(data: Date | null | undefined): string | null {
	if (!data) return null;
	return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export const load: PageServerLoad = ({ locals, url }) => {
	const teacher = requireTeacher(locals);
	const status = estadoDoPlano(teacher.subscriptionStatus);

	return {
		// A aba vem da URL para a barra lateral continuar apontando para a
		// assinatura: `/assinatura` redireciona para cá com `?aba=assinatura`.
		aba: url.searchParams.get('aba') === 'assinatura' ? 'assinatura' : 'dados',
		teacher: {
			name: teacher.name,
			email: teacher.email,
			// Troca de e-mail com confirmação pendente ainda não existe.
			pendingEmail: null,
			/** Dezoito números, ou nulo para cair nas iniciais (`$lib/avatar/montar.ts`). */
			avatar: teacher.avatar ?? null
		},
		plan: {
			status,
			name: teacher.plan ?? 'Plano professor',
			periodEnd: dataPorExtenso(teacher.currentPeriodEnd),
			// A MESMA decisão que barra o botão de publicar — nunca uma cópia
			// dela aqui (billing.md "Entitlements").
			podePublicar: can(teacher, 'publicar_atividade')
		},
		// Sem provedor de cobrança não há fatura. A lista existe na tela para
		// quando o Stripe entrar — vazia, nunca inventada.
		invoices: []
	};
};
