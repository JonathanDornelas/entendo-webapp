<script lang="ts">
	/**
	 * Paginação de tabela do Studio.
	 *
	 * **Só aparece quando precisa.** Com uma página só de resultados o controle
	 * não é informação, é ruído — e a tabela de um professor que tem cinco
	 * atividades nunca deveria mostrar "1 de 1".
	 *
	 * A contagem vai em TEXTO ("13–24 de 57"), não só em números de página: o
	 * professor quer saber quanto falta, e "página 2" sozinho não diz isso.
	 */
	let {
		pagina = $bindable(1),
		porPagina,
		total,
		rotulo = 'itens'
	}: {
		/** 1-based. `$bindable` porque quem paginou é a tabela, não este componente. */
		pagina?: number;
		porPagina: number;
		total: number;
		/** Como chamar o que está listado: "atividades", "materiais", "alunos". */
		rotulo?: string;
	} = $props();

	const paginas = $derived(Math.max(1, Math.ceil(total / porPagina)));
	const primeiro = $derived(total === 0 ? 0 : (pagina - 1) * porPagina + 1);
	const ultimo = $derived(Math.min(pagina * porPagina, total));

	// Uma janela curta em volta da atual, com as pontas sempre presentes: com
	// 40 páginas, listar todas empurraria a tabela para fora da tela.
	const numeros = $derived.by(() => {
		const janela = new Set<number>([1, paginas, pagina, pagina - 1, pagina + 1]);
		return [...janela].filter((n) => n >= 1 && n <= paginas).sort((a, b) => a - b);
	});

	function ir(destino: number) {
		pagina = Math.min(Math.max(destino, 1), paginas);
	}
</script>

{#if paginas > 1}
	<nav
		class="mt-3.5 flex flex-wrap items-center gap-2.5"
		aria-label="Paginação {rotulo === 'itens' ? '' : `de ${rotulo}`}"
	>
		<span class="text-[12.5px] text-base-content/65">
			{primeiro}–{ultimo} de {total}
			{rotulo}
		</span>
		<div class="flex-1"></div>

		<button
			type="button"
			onclick={() => ir(pagina - 1)}
			disabled={pagina <= 1}
			class="btn btn-sm motion-tap gap-1.5 btn-neutral font-semibold disabled:opacity-40"
		>
			<svg class="size-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M15 5l-7 7 7 7"
					stroke="currentColor"
					stroke-width="2.4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			Anterior
		</button>

		<div class="flex items-center gap-1">
			{#each numeros as n, i (n)}
				<!-- O "…" marca o salto: sem ele, 1 · 7 · 8 · 9 · 40 parece uma lista
				     quebrada em vez de uma janela. -->
				{#if i > 0 && n - numeros[i - 1] > 1}
					<span class="px-1 text-[12.5px] text-base-content/50" aria-hidden="true">…</span>
				{/if}
				<button
					type="button"
					onclick={() => ir(n)}
					aria-current={n === pagina ? 'page' : undefined}
					aria-label="Página {n}"
					class="grid size-8 place-items-center rounded-field text-[13px] transition-colors
					       {n === pagina
						? 'bg-base-300 font-bold text-primary'
						: 'text-base-content/65 hover:bg-base-200'}"
				>
					{n}
				</button>
			{/each}
		</div>

		<button
			type="button"
			onclick={() => ir(pagina + 1)}
			disabled={pagina >= paginas}
			class="btn btn-sm motion-tap gap-1.5 btn-neutral font-semibold disabled:opacity-40"
		>
			Próxima
			<svg class="size-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M9 5l7 7-7 7"
					stroke="currentColor"
					stroke-width="2.4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</nav>
{/if}
