import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db/client';
import { stripeClient } from '$lib/server/billing/stripe-client';

/**
 * Fonte da verdade da cobrança — ver .claude/rules/billing.md "As três
 * disciplinas". Precisa do corpo cru para verificar a assinatura, por isso é
 * um +server.ts e não uma remote function nem form action.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');
	if (!signature) error(400, 'Assinatura ausente');

	let event;
	try {
		event = stripeClient.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
	} catch {
		error(400, 'Assinatura inválida');
	}

	// Idempotência: o Stripe reenvia eventos. Ver billing.md ponto 3.
	const alreadyProcessed = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
	if (alreadyProcessed) return json({ received: true });

	switch (event.type) {
		// TODO: mapear eventos de assinatura para os campos de Teacher
		// (plan, subscriptionStatus, currentPeriodEnd, gracePeriodEnd) assim
		// que os planos forem definidos — ver "Pendências" no CLAUDE.md e
		// docs/adr-002-billing.md.
		default:
			break;
	}

	await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });

	return json({ received: true });
};
