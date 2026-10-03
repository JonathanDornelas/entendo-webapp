<script lang="ts">
	type ItemState = 'unanswered' | 'correct' | 'partial' | 'incorrect';

	let { items }: { items: { state: ItemState }[] } = $props();

	const labels: Record<ItemState, string> = {
		unanswered: 'não respondido',
		correct: 'correto',
		partial: 'parcial',
		incorrect: 'incorreto'
	};
</script>

<div class="flex gap-1.5" role="list" aria-label="Resultado por questão">
	{#each items as item, i (i)}
		<div
			role="listitem"
			class="h-1.5 flex-1 rounded-full"
			class:bg-success={item.state === 'correct'}
			class:bg-warning={item.state === 'partial'}
			class:bg-error={item.state === 'incorrect'}
			class:bg-base-300={item.state === 'unanswered'}
			aria-label="Questão {i + 1}: {labels[item.state]}"
		></div>
	{/each}
</div>
