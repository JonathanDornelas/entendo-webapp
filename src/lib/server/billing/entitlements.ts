export type Entitlement = 'publicar_atividade' | 'usar_asr';

/**
 * Só o estado de cobrança importa — assim a mesma função serve tanto para a
 * linha do Prisma quanto para o usuário da sessão do Better Auth, que traz
 * os mesmos campos com opcionalidade diferente.
 */
export interface BillingState {
	subscriptionStatus?: string | null;
	gracePeriodEnd?: Date | null;
}

/**
 * Ponto único de decisão de acesso — ver .claude/rules/billing.md
 * "Entitlements". Nunca espalhe `subscriptionStatus === 'active'` fora daqui.
 *
 * Assinatura vencida não derruba link publicado nem apaga nada: o professor
 * perde a capacidade de criar/publicar, mas o que já está publicado continua
 * respondendo até `gracePeriodEnd`.
 */
export function can(teacher: BillingState, entitlement: Entitlement): boolean {
	const withinGracePeriod = teacher.gracePeriodEnd ? teacher.gracePeriodEnd > new Date() : false;
	// `trialing` é o estado do professor recém-cadastrado enquanto o Stripe
	// não está plugado — decisão PROVISÓRIA de trial (duração e exigência de
	// cartão continuam em aberto, ver "Pendências" no CLAUDE.md e o ADR de
	// cobrança). Quando o checkout existir, quem escreve este campo é o
	// webhook.
	const paying =
		teacher.subscriptionStatus === 'active' || teacher.subscriptionStatus === 'trialing';

	switch (entitlement) {
		case 'publicar_atividade':
			return paying;
		case 'usar_asr':
			return paying || withinGracePeriod;
	}
}
