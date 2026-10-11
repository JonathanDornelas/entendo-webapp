import type { CicloDeCobranca, PlanoPago } from '$lib/billing/catalogo';

/**
 * Interface própria de cobrança — ver .claude/rules/billing.md e
 * docs/adr-002-billing.md. Nenhum código de produto fala com um gateway direto:
 * fala com isto.
 *
 * **Hoje não existe gateway** (decisão do dono do repositório): o provedor em
 * uso é o MANUAL (`./manual-provider.ts`), que transforma "assinar" num pedido
 * que a equipe atende pelo painel interno. Quando um gateway entrar (Stripe,
 * ou um local com Pix), ele implementa esta mesma interface — e o webhook dele
 * escreve pelo `./assinaturas.ts`, como o painel.
 *
 * O resultado é DISCRIMINADO em vez de sempre uma URL: um provedor manual não
 * tem para onde redirecionar, e fingir uma URL faria a tela mandar o professor
 * para lugar nenhum.
 */

export type ResultadoDeAssinatura =
	/** Gateway: o professor segue para o checkout. A confirmação vem pelo webhook, nunca pelo redirect. */
	| { tipo: 'redirecionar'; url: string }
	/** Manual: o pedido foi registrado e a equipe foi avisada. */
	| { tipo: 'pedido'; pedidoId: string };

export type ResultadoDoPortal = { tipo: 'redirecionar'; url: string } | { tipo: 'indisponivel' };

export interface BillingProvider {
	readonly nome: 'manual' | 'stripe';
	iniciarAssinatura(
		teacher: { id: string; name: string; email: string },
		plano: PlanoPago,
		ciclo: CicloDeCobranca
	): Promise<ResultadoDeAssinatura>;
	abrirPortal(teacherId: string): Promise<ResultadoDoPortal>;
}
