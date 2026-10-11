<script lang="ts">
	// O "Seu plano" da barra lateral do Studio: em que plano a conta está, quanto
	// do ESTOQUE ela ocupa (atividades e materiais) e os créditos de IA. Os
	// limites são de estoque (docs/adr-002-billing.md), então a barra é "tenho
	// N de M", nunca "criei N este mês".
	//
	// Não decide nada: recebe o `ResumoDoAcesso` que o servidor montou a partir
	// de `can()`. O link de ação muda com a situação — quem está em trial ou com
	// o plano vencido vê "Escolher um plano"; quem assina vê "Ver meu plano".
	import { resolve } from '$app/paths';
	import { fracaoDeUso, type ResumoDoAcesso } from '$lib/billing/resumo';

	let {
		acesso,
		/** Falso no painel interno: lá o link "Escolher um plano" levaria o ADMIN para a vitrine. */
		mostrarAcao = true
	}: { acesso: ResumoDoAcesso; mostrarAcao?: boolean } = $props();

	const linhas = $derived([
		{ rotulo: 'Atividades', usado: acesso.uso.atividades, limite: acesso.limites.atividades },
		{ rotulo: 'Materiais', usado: acesso.uso.materiais, limite: acesso.limites.materiais }
	]);

	const bloqueada = $derived(acesso.situacao === 'expirada' || acesso.situacao === 'cancelada');
	const precisaEscolher = $derived(acesso.origem === 'trial' || bloqueada);

	const legenda = $derived.by(() => {
		if (acesso.origem === 'trial' && acesso.diasDeTrial !== null) {
			return acesso.diasDeTrial === 1
				? 'Falta 1 dia de teste'
				: `Faltam ${acesso.diasDeTrial} dias de teste`;
		}
		if (acesso.situacao === 'atrasada') return 'Pagamento pendente';
		if (acesso.situacao === 'expirada') return 'Criar e publicar estão pausados';
		if (acesso.situacao === 'cancelada') return 'Assinatura encerrada';
		if (acesso.cancelAtPeriodEnd) return 'Encerra no fim do período';
		if (acesso.escola) return acesso.escola.nome;
		return null;
	});
</script>

<div class="rounded-[12px] bg-base-200 p-3.5">
	<p class="text-xs font-bold">{acesso.rotulo}</p>
	{#if legenda}
		<p
			class="mt-0.5 text-[11.5px] {bloqueada || acesso.situacao === 'atrasada'
				? 'font-semibold text-error'
				: 'text-base-content/60'}"
		>
			{legenda}
		</p>
	{/if}

	<dl class="mt-2.5 space-y-2">
		{#each linhas as linha (linha.rotulo)}
			{@const cheio = linha.usado >= linha.limite}
			<div>
				<div class="flex items-baseline justify-between text-[11.5px]">
					<dt class="text-base-content/70">{linha.rotulo}</dt>
					<dd class="font-mono {cheio ? 'font-bold text-error' : 'text-base-content/70'}">
						{linha.usado}/{linha.limite}
					</dd>
				</div>
				<div class="mt-1 h-[5px] overflow-hidden rounded-full bg-base-300" aria-hidden="true">
					<div
						class="h-full origin-left rounded-full {cheio ? 'bg-error' : 'bg-primary'}"
						style="transform: scaleX({fracaoDeUso(linha.usado, linha.limite)})"
					></div>
				</div>
			</div>
		{/each}
		{#if acesso.limites.ia}
			<div class="flex items-baseline justify-between text-[11.5px]">
				<dt class="text-base-content/70">Créditos de IA</dt>
				<dd class="font-mono text-base-content/70">
					{acesso.creditos.saldo}/{acesso.limites.creditosPorCiclo}
				</dd>
			</div>
		{/if}
	</dl>

	{#if mostrarAcao}
		<!-- eslint-disable svelte/no-navigation-without-resolve -- rota resolvida mais a query da aba; a regra não enxerga a concatenação. -->
		<a
			href={precisaEscolher
				? resolve('/(site)/planos')
				: resolve('/(studio)/conta') + '?aba=assinatura'}
			class="mt-3 inline-block text-[12.5px] font-bold text-primary no-underline"
		>
			{precisaEscolher ? 'Escolher um plano' : 'Ver meu plano'}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{/if}
</div>
