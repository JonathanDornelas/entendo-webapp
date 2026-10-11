import { env } from '$env/dynamic/private';
import { manualBillingProvider } from './manual-provider';
import type { BillingProvider } from './provider';

/**
 * Qual provedor de cobrança está em uso. `BILLING_PROVIDER` vazio ou `manual`
 * é o estado de hoje: não existe gateway (docs/adr-002-billing.md). O Stripe
 * continua instalado e com o webhook dormente em `routes/api/stripe`, mas não
 * tem implementação desta interface — pedir `stripe` aqui falha alto em vez de
 * cair no manual achando que cobrou.
 */
export function getBillingProvider(): BillingProvider {
	const nome = env.BILLING_PROVIDER;
	if (!nome || nome === 'manual') return manualBillingProvider;
	throw new Error(`BILLING_PROVIDER="${nome}" não tem implementação. Use "manual".`);
}
