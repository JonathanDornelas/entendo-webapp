import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

/**
 * Única importação do SDK do Stripe no projeto — ver .claude/rules/billing.md
 * "Nenhum código de produto importa o SDK do Stripe direto". Cobrança fica
 * atrás do `BillingProvider` (./provider.ts); isto aqui é implementação.
 */
// O fallback existe só para não quebrar a análise estática de rotas do
// SvelteKit, que importa este módulo sem `.env` carregado — ver client.ts.
export const stripeClient = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
