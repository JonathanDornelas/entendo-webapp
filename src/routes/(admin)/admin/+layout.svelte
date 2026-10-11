<script lang="ts">
	// O painel INTERNO da plataforma — de quem opera o produto, não do
	// professor. Layout próprio e sóbrio: nada da barra lateral do Studio, para
	// nunca parecer uma tela que um professor deveria ver.
	//
	// A barreira não é este layout (layout não é barreira — auth.md): é o
	// `hooks.server.ts` (404 para quem não administra) e o `requirePlatformAdmin`
	// em cada load e em cada remote function.
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/Logo.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const nav = [
		{ href: resolve('/(admin)/admin'), label: 'Visão geral', exato: true },
		{ href: resolve('/(admin)/admin/professores'), label: 'Professores', exato: false },
		{ href: resolve('/(admin)/admin/pedidos'), label: 'Pedidos', exato: false },
		{ href: resolve('/(admin)/admin/escolas'), label: 'Escolas', exato: false }
	];

	const ativo = (href: string, exato: boolean) =>
		exato ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<div class="min-h-dvh bg-base-100">
	<header class="border-b border-line bg-base-200">
		<div
			class="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-2 px-gutter-sm py-3"
		>
			<Logo size={20} sub="painel interno" />
			<nav class="flex flex-wrap gap-1" aria-label="Painel interno">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						aria-current={ativo(item.href, item.exato) ? 'page' : undefined}
						class="rounded-field px-3 py-2 text-[13.5px] no-underline transition-colors
						       {ativo(item.href, item.exato)
							? 'bg-base-100 font-bold text-primary'
							: 'font-semibold text-base-content/70 hover:text-base-content'}">{item.label}</a
					>
				{/each}
			</nav>
			<a href={resolve('/(studio)/inicio')} class="ms-auto text-[13px] font-semibold"
				>Voltar ao Studio</a
			>
		</div>
	</header>
	<main class="mx-auto max-w-[1180px] px-gutter-sm py-gutter-sm">
		{@render children()}
	</main>
</div>
