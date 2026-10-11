<script lang="ts">
	// Os PRÓXIMOS 7 DIAS de envio de módulo — a mesma faixa na lista de módulos
	// (de todos e de cada um) e no módulo aberto (docs/telas-modulos-professor.md).
	// Um cartão por turma por dia, porque é um e-mail por aluno por data; cada um
	// abre a programação daquela turma no módulo.
	//
	// O dia com envio é LARGO e o vazio é estreito: a semana inteira cabe numa
	// linha no desktop sem espremer o que importa. No celular a faixa rola de
	// lado, e o dia vazio continua ali — "nada" é informação, não buraco.
	//
	// Rascunho tem contorno tracejado e o aviso escrito, nunca só a cor.
	import { resolve } from '$app/paths';
	import { CLASSE_DA_ETIQUETA } from '$lib/etiquetas';
	import type { DiaDaSemana } from '$lib/modulos/agenda';

	let { dias, rotulo = 'Próximos 7 dias' }: { dias: DiaDaSemana[]; rotulo?: string } = $props();

	const colunas = (largura: (vazio: boolean) => string) =>
		dias.map((d) => largura(d.envios.length === 0)).join(' ');
	const colunasLg = $derived(colunas((v) => (v ? 'minmax(52px,0.55fr)' : 'minmax(0,2.2fr)')));
	const colunasCelular = $derived(colunas((v) => (v ? '62px' : '168px')));
</script>

<ol
	aria-label={rotulo}
	style="--cols: {colunasCelular}; --cols-lg: {colunasLg};"
	class="-mx-4 grid list-none grid-cols-(--cols) gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid-cols-(--cols-lg) lg:overflow-visible lg:px-0 lg:pb-0"
>
	{#each dias as d (d.dia)}
		<li
			class="flex min-w-0 flex-col gap-1.5 rounded-[12px] p-2.5 {d.envios.length > 0
				? 'border border-line bg-base-200'
				: 'border border-dashed border-line'}"
		>
			<span class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
				<span
					class="text-[12px] font-bold tracking-[0.06em] uppercase {d.hoje
						? 'text-primary'
						: 'text-base-content'}">{d.rotulo}</span
				>
				<span class="font-mono text-[12px] text-base-content/65">{d.data}</span>
			</span>
			{#each d.envios as e (e.chave)}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- rota resolvida mais a query que abre o painel da turma. -->
				<a
					href={resolve('/(studio)/modulos/[id]', { id: e.moduloId }) + '?turma=' + e.alocacaoId}
					title={e.descricao}
					class="grid motion-tap gap-1.25 rounded-[9px] bg-base-100 px-2.5 py-2.25 text-base-content no-underline transition-transform duration-150 hover:-translate-y-0.5 {e.rascunho
						? 'border-[1.5px] border-dashed border-base-content/55'
						: 'border border-line'}"
				>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
					<span class="flex flex-wrap items-center gap-x-1.75 gap-y-1">
						<span
							class="rounded-[6px] px-1.5 py-0.75 text-[11px] font-bold {CLASSE_DA_ETIQUETA[
								e.turma.cor
							]}">{e.turma.sigla}</span
						>
						<span class="font-mono text-[11.5px] text-base-content/65">{e.hora}</span>
					</span>
					<span class="text-[12.5px] leading-snug font-semibold text-pretty">{e.titulo}</span>
					{#if e.rascunho}
						<span class="flex items-center gap-1.25 text-[11.5px] font-bold">
							<svg class="size-3 flex-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"
								><path
									d="M12 8v5M12 16.5h.01M12 3l9.5 17H2.5z"
									stroke="currentColor"
									stroke-width="2.4"
									stroke-linecap="round"
									stroke-linejoin="round"
								/></svg
							>
							ainda é rascunho
						</span>
					{/if}
				</a>
			{:else}
				<span class="text-[12px] text-base-content/65">nada</span>
			{/each}
		</li>
	{/each}
</ol>
