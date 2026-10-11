<script lang="ts">
	// A tabela de materiais — a mesma na biblioteca e na etapa 2 do wizard.
	// O que muda entre as duas é a quarta coluna ("Em uso" lá, "Origem" aqui)
	// e o que "remover" significa: apagar da biblioteca, ou só tirar desta
	// atividade. Tudo o mais é uma linha só, desenhada uma vez.
	import Loading from './Loading.svelte';
	import IdiomaTag from './IdiomaTag.svelte';
	import { PILL_TONE, tipoDe, type MaterialRow } from './material-form';
	import { getProfile } from '$lib/kernel/language/profiles';
	import { idiomaDe } from '$lib/idiomas';

	/** A biblioteca mistura idiomas: cada linha mostra o conteúdo na direção da língua DELA. */
	const direcaoDe = (tag: string) => (idiomaDe(tag) ? getProfile(tag).direction : 'ltr');

	let {
		materiais,
		contexto,
		contentTag = 'und',
		dir = 'ltr',
		editandoId = null,
		removendoId = null,
		onedit,
		onremove
	}: {
		materiais: MaterialRow[];
		contexto: 'biblioteca' | 'wizard';
		contentTag?: string;
		dir?: 'ltr' | 'rtl';
		/** A linha aberta no formulário fica marcada. */
		editandoId?: string | null;
		/** O ID da linha cuja remoção está no servidor — nunca um booleano (components.md "Espera"). */
		removendoId?: string | null;
		onedit: (m: MaterialRow) => void;
		onremove: (m: MaterialRow) => void;
	} = $props();

	const wiz = $derived(contexto === 'wizard');
	const colunas = 'lg:grid-cols-[132px_minmax(0,1fr)_148px_128px_96px]';
</script>

<div class="overflow-hidden rounded-box border border-line">
	<div
		class="hidden gap-3.5 border-b border-line bg-base-200 px-4 py-2.5 text-[11px] font-bold tracking-[0.09em] text-base-content/65 uppercase lg:grid {colunas}"
	>
		<span>Tipo</span>
		<span>Conteúdo</span>
		<span>Idioma</span>
		<span>{wiz ? 'Origem' : 'Em uso'}</span>
		<span></span>
	</div>
	{#each materiais as m (m.id)}
		{@const tipo = tipoDe(m.kind)}
		<div
			class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 border-b border-line px-3.5 py-3 transition-colors last:border-0 hover:bg-base-200 lg:px-4 lg:py-[13px] {colunas}
			       {editandoId === m.id ? 'bg-base-200' : ''}"
		>
			<!-- No celular: pílula e ações na primeira linha, conteúdo na segunda. As
			     posições vão EXPLÍCITAS porque item com linha fixa é colocado antes dos
			     automáticos — sem isso as ações caíam na coluna 1 e a pílula ia parar
			     à direita. -->
			<span class="contents lg:block">
				<span
					class="col-start-1 row-start-1 inline-flex items-center gap-1.5 justify-self-start rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap lg:col-auto lg:row-auto {PILL_TONE[
						tipo.tone
					]}"
				>
					<svg class="size-[13px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d={tipo.icon}
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					{tipo.label}
				</span>
			</span>
			<span class="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:row-auto">
				<span
					class="mb-0.5 block truncate font-content text-[14px] font-semibold"
					dir={m.idioma ? direcaoDe(m.idioma) : dir}
					data-content-lang={m.idioma ?? contentTag}>{m.primary}</span
				>
				<span
					class="block truncate text-[12.5px] {m.kind === 'text' && m.questions.length === 0
						? 'font-semibold text-warning'
						: 'text-base-content/65'}">{m.secondary}</span
				>
			</span>
			<span class="hidden min-w-0 lg:block"><IdiomaTag tag={m.idioma} /></span>
			<span class="hidden min-w-0 lg:block">
				{#if wiz}
					{#if m.daBiblioteca}
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-accent/14 px-2.5 py-1 text-[12px] font-bold whitespace-nowrap text-accent"
							title="Este material já estava na sua biblioteca — ele foi reaproveitado, não duplicado."
						>
							biblioteca
						</span>
					{:else}
						<span class="text-[13px] text-base-content/65">só aqui</span>
					{/if}
				{:else if m.usedIn === 0}
					<span class="text-[13px] text-base-content/50">nenhuma atividade</span>
				{:else}
					<span class="text-[13px] text-base-content/65">
						{m.usedIn}
						{m.usedIn === 1 ? 'atividade' : 'atividades'}
					</span>
				{/if}
			</span>
			<span class="col-start-2 row-start-1 flex gap-1.5 justify-self-end lg:col-auto lg:row-auto">
				<button
					type="button"
					onclick={() => onedit(m)}
					class="btn btn-sm {editandoId === m.id ? 'btn-outline' : 'btn-plain'}">Editar</button
				>
				<button
					type="button"
					onclick={() => onremove(m)}
					disabled={removendoId !== null}
					class="grid size-[38px] place-items-center rounded-field border border-line text-base-content/65 transition-colors hover:border-error hover:text-error disabled:opacity-50"
					aria-label={wiz
						? `Remover ${m.primary} desta atividade`
						: `Apagar ${m.primary} da biblioteca`}
				>
					{#if removendoId === m.id}
						<Loading variant="fila" size={10} tone="current" label="Removendo" />
					{:else if wiz}
						<svg class="size-[15px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M6 6l12 12M18 6L6 18"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
					{:else}
						<svg class="size-[15px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M5 7.5h14M9.5 7.5V5.5h5v2M7 7.5l1 12h8l1-12"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{/if}
				</button>
			</span>
		</div>
	{/each}
</div>
