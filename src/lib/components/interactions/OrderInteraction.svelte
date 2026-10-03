<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import type { OrderRuntimeItem } from './types';

	// Ordenar falas. Duas formas equivalentes, e isso não é redundância:
	// arrastar é o gesto natural de reordenar, e as setas são o caminho que
	// funciona no teclado, no leitor de tela e para quem tem dificuldade motora
	// (design-system.md "Acessibilidade" — toda interação funciona pelo
	// teclado). `svelte-dnd-action` tem suporte a teclado nativo, mas as setas
	// continuam porque elas dizem o que fazem; um alvo arrastável não.
	// Correção por sequência.
	let { item, order = $bindable([]) }: { item: OrderRuntimeItem; order?: string[] } = $props();

	/** As falas na ordem atual — é isso que a zona de arrastar consome. */
	const linhas = $derived(
		order
			.map((id) => item.lines.find((l) => l.id === id))
			.filter((l): l is { id: string; text: string } => !!l)
	);

	function handleDnd(e: CustomEvent<DndEvent<{ id: string; text: string }>>) {
		order = e.detail.items.map((l) => l.id);
	}

	function move(i: number, delta: number) {
		const next = [...order];
		const j = i + delta;
		if (j < 0 || j >= next.length) return;
		[next[i], next[j]] = [next[j], next[i]];
		order = next;
	}

	const arrow = 'grid h-[22px] w-[26px] place-items-center rounded-md transition-colors';
</script>

<p class="mb-4 text-[13.5px] leading-snug text-base-content/65">
	Arraste as falas, ou use as setas, para colocá-las na ordem certa.
</p>

<p class="mb-3.5 text-[12.5px] font-semibold text-base-content/65">
	Coloque as falas na ordem certa
</p>

<ul
	use:dndzone={{ items: linhas, flipDurationMs: 220 }}
	onconsider={handleDnd}
	onfinalize={handleDnd}
	class="grid list-none gap-2.5 p-0"
	aria-label="Falas na ordem"
>
	{#each linhas as line, i (line.id)}
		<li
			dir={item.dir}
			class="flex min-h-14 cursor-grab items-center gap-2.5 rounded-box border-[1.5px] border-b-[3px]
			       border-line bg-base-100 px-3 py-3 transition-[transform,border-color] duration-150
			       hover:border-primary active:cursor-grabbing"
		>
			<!-- A alça é DECORATIVA: quem arrasta é a linha inteira, e o ícone só
			     diz que dá para arrastar. Fosse ela o único alvo, o gesto ficaria
			     num quadrado de 20px no celular. -->
			<span class="shrink-0 text-base-content/40" aria-hidden="true">
				<svg class="size-4" viewBox="0 0 24 24" fill="none">
					<path
						d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"
						stroke="currentColor"
						stroke-width="2.6"
						stroke-linecap="round"
					/>
				</svg>
			</span>
			<span
				class="grid size-6 shrink-0 place-items-center rounded-full bg-base-300 font-mono text-xs text-base-content/65"
			>
				{i + 1}
			</span>
			<span class="flex-1 font-content text-[15.5px] leading-snug">{line.text}</span>
			<span class="grid gap-0.5">
				<button
					type="button"
					onclick={() => move(i, -1)}
					disabled={i === 0}
					class="{arrow} bg-base-200 text-base-content hover:bg-base-300 disabled:opacity-40"
					aria-label="Mover “{line.text}” para cima"
				>
					<svg class="size-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M6 15l6-6 6 6"
							stroke="currentColor"
							stroke-width="2.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					onclick={() => move(i, 1)}
					disabled={i === order.length - 1}
					class="{arrow} bg-base-200 text-base-content hover:bg-base-300 disabled:opacity-40"
					aria-label="Mover “{line.text}” para baixo"
				>
					<svg class="size-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M6 9l6 6 6-6"
							stroke="currentColor"
							stroke-width="2.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</span>
		</li>
	{/each}
</ul>
