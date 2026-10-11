<script lang="ts">
	// A TAG DE IDIOMA de atividade, turma e material — o idioma que o aluno
	// aprende (`$lib/idiomas.ts`). É UM desenho em todo lugar: o código do idioma
	// num quadradinho, em mono (é literalmente o subtag BCP-47), e o nome em
	// português ao lado, que é o que o professor lê.
	//
	// **Sem cor própria.** Idioma é metadado, não estado nem identidade: cor de
	// identidade é a etiqueta da turma e do módulo, e verde/âmbar/vermelho são a
	// semântica de correção (design-system.md). Sem idioma é contorno tracejado e
	// "sem idioma" escrito — o mesmo padrão de "sem e-mail" na chamada.
	import { idiomaDe } from '$lib/idiomas';

	let {
		tag,
		compacta = false,
		class: className = ''
	}: {
		tag: string | null | undefined;
		/** Só o código, com o nome no `title` e para leitor de tela — para linha muito densa. */
		compacta?: boolean;
		class?: string;
	} = $props();

	const idioma = $derived(idiomaDe(tag));
</script>

{#if idioma}
	<span
		class="inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border border-line bg-base-100 py-[3px] ps-[3px] text-[12.5px] leading-none font-semibold whitespace-nowrap text-base-content {compacta
			? 'pe-[3px]'
			: 'pe-2.5'} {className}"
		title={compacta ? idioma.rotulo : undefined}
	>
		<span
			class="grid h-[18px] min-w-[22px] place-items-center rounded-full bg-base-300 px-1 font-mono text-[10px] font-medium tracking-[0.04em] text-primary"
			aria-hidden="true">{idioma.codigo}</span
		>
		{#if compacta}
			<span class="sr-only">{idioma.rotulo}</span>
		{:else}
			<span class="truncate">{idioma.rotulo}</span>
		{/if}
	</span>
{:else}
	<span
		class="inline-flex shrink-0 items-center rounded-full border-[1.5px] border-dashed border-line px-2.5 py-[3px] text-[12px] leading-[18px] font-semibold whitespace-nowrap text-base-content/65 {className}"
		>sem idioma</span
	>
{/if}
