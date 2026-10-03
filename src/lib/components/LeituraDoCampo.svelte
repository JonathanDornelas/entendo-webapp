<script lang="ts">
	// A leitura, em letras latinas, do que o aluno digitou — `おはよう` → `ohayou`.
	// Serve para ele conferir que tocou o que quis antes de verificar. Só existe
	// na GRADE (kana, árabe, devanágari): na barra de acentos o texto já é
	// latino, e repeti-lo embaixo seria ruído.
	//
	// Segue a mesma chave das teclas ("Pronúncia nas teclas"): as duas coisas
	// dizem a mesma, e quem desligou uma não quer a outra.
	import { pronuncia } from '$lib/client/pronuncia.svelte';
	import { leituraDoTexto } from '$lib/kernel/language/leitura';
	import type { Teclado } from '$lib/kernel/language/teclado';

	let { teclado, texto }: { teclado: Teclado; texto: string } = $props();

	$effect(() => pronuncia.sincronizar());

	// Quando a leitura é o próprio texto (o pinyin JÁ é latino), repeti-la
	// embaixo seria ruído.
	const leitura = $derived.by(() => {
		if (teclado.formato !== 'grade' || !pronuncia.ligada || !texto.trim()) return '';
		const lida = leituraDoTexto(teclado, texto);
		return lida === texto ? '' : lida;
	});
</script>

{#if leitura}
	<p
		class="mt-2.5 flex items-baseline gap-2.5 border-t border-dashed border-line pt-2.5"
		aria-live="off"
	>
		<span class="text-[11px] font-bold tracking-[0.08em] text-base-content/65 uppercase">
			Leitura
		</span>
		<span class="min-w-0 font-mono text-[13.5px] break-all">{leitura}</span>
	</p>
{/if}
