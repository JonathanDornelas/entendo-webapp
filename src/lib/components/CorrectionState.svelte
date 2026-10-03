<script lang="ts">
	type State = 'unanswered' | 'correct' | 'partial' | 'incorrect';

	let {
		state = 'unanswered',
		answer = '',
		message = '',
		lang,
		dir = 'ltr'
	}: {
		state?: State;
		answer?: string;
		message?: string;
		lang?: string;
		dir?: 'ltr' | 'rtl';
	} = $props();

	const map: Record<State, { border: string; bg: string; text: string; label: string }> = {
		unanswered: {
			border: 'border-dashed border-line',
			bg: 'bg-base-200',
			text: 'text-base-content/60',
			label: 'Não respondido'
		},
		correct: {
			border: 'border-success',
			bg: 'bg-base-100',
			text: 'text-success',
			label: 'Correto'
		},
		partial: { border: 'border-warning', bg: 'bg-base-100', text: 'text-warning', label: 'Quase' },
		incorrect: { border: 'border-error', bg: 'bg-base-100', text: 'text-error', label: 'Incorreto' }
	};
	let s = $derived(map[state]);
</script>

{#key state}
	<div class="flex feedback-in items-center gap-2.5 {s.text}">
		{#if state === 'correct'}
			<svg class="size-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
				<path
					d="M7.5 12.5l3 3 6-6.5"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{:else if state === 'partial'}
			<svg class="size-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
				<path d="M12 3a9 9 0 010 18z" fill="currentColor" />
			</svg>
		{:else if state === 'incorrect'}
			<svg class="size-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
				<path
					d="M8.5 8.5l7 7M15.5 8.5l-7 7"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		{:else}
			<svg class="size-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle
					cx="12"
					cy="12"
					r="9"
					stroke="currentColor"
					stroke-width="2"
					stroke-dasharray="3 3.5"
				/>
			</svg>
		{/if}
		<span class="text-[15px] font-bold">{s.label}</span>
	</div>

	<div
		data-content-lang={lang}
		{dir}
		class="mt-4 feedback-in rounded-box border-[1.5px] p-3.5 text-[18px] {s.border} {s.bg}"
	>
		{answer || '—'}
	</div>
{/key}

{#if message}
	<p class="mt-3 text-[13px] leading-relaxed text-base-content/60">{message}</p>
{/if}
