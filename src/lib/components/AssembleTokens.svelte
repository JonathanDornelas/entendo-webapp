<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';

	type Token = { id: string; text: string };

	let {
		tokens = $bindable<Token[]>([]),
		pool = $bindable<Token[]>([]),
		lang,
		dir = 'ltr'
	}: {
		tokens?: Token[];
		pool?: Token[];
		lang?: string;
		dir?: 'ltr' | 'rtl';
	} = $props();

	function handleDnd(e: CustomEvent<DndEvent<Token>>) {
		tokens = e.detail.items;
	}

	function returnToPool(token: Token) {
		tokens = tokens.filter((t) => t.id !== token.id);
		pool = [...pool, token];
	}
</script>

<ul
	use:dndzone={{ items: tokens, flipDurationMs: 220 }}
	onconsider={handleDnd}
	onfinalize={handleDnd}
	class="flex min-h-[104px] list-none flex-wrap content-start gap-2 rounded-box border-[1.5px]
	       border-dashed border-line bg-base-200 p-3"
	data-content-lang={lang}
	{dir}
	aria-label="Frase montada"
>
	{#each tokens as t (t.id)}
		<li>
			<button
				type="button"
				class="rounded-field border border-b-[3px] border-line bg-base-100 px-3.5 py-2.5
				       text-[17px] transition-transform hover:-translate-y-[3px] hover:border-primary"
				onclick={() => returnToPool(t)}
			>
				{t.text}
			</button>
		</li>
	{/each}
</ul>
