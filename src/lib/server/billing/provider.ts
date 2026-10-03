/**
 * Interface própria de cobrança — ver .claude/rules/billing.md. Stripe é a
 * implementação atual, mas recorrência com cartão no Brasil tem taxa de
 * recusa alta e pode ser necessário trocar por um gateway local com Pix
 * (docs/adr-002-billing.md). Nenhum código de produto importa o SDK do
 * Stripe direto — só fala com isto.
 */
export interface BillingProvider {
	createCheckoutSession(teacherId: string, plan: string): Promise<{ url: string }>;
	createPortalSession(teacherId: string): Promise<{ url: string }>;
}

// A implementação Stripe (checkout, troca de plano, portal) entra aqui quando
// os planos e preços forem definidos — ver "Pendências" no CLAUDE.md.
