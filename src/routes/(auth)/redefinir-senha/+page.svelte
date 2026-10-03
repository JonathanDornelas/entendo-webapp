<script lang="ts">
	import { goto } from '$app/navigation';
	import Loading from '$lib/components/Loading.svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/client/auth';

	// Token inválido é ESTADO PRÓPRIO com caminho de volta — nunca um form que
	// falha no submit. O token chega por query string (?token=...), anexado
	// pelo Better Auth ao redirectTo passado em forgetPassword().
	const token = $derived(page.url.searchParams.get('token'));

	let pw = $state('');
	let confirm = $state('');
	let loading = $state(false);
	let expired = $state(false);
	const match = $derived(pw.length >= 8 && pw === confirm);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!token) return;
		loading = true;
		const { error } = await authClient.resetPassword({ newPassword: pw, token });
		loading = false;
		if (error) {
			expired = true;
			return;
		}
		await goto(resolve('/(auth)/entrar'));
	}
</script>

<svelte:head><title>Nova senha — entendo</title></svelte:head>

<div
	class="w-full max-w-[384px] rounded-box border border-line bg-base-100 p-8 shadow-[0_24px_56px_-34px_rgb(var(--shadow)/0.35)]"
>
	{#if !token || expired}
		<div class="text-center">
			<span
				class="mb-4 inline-grid size-[52px] place-items-center rounded-full bg-error/15 text-error"
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
					<path
						d="M12 7.5v6M12 16.5h.01"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</span>
			<h1 class="mb-2 font-display text-xl font-semibold tracking-[-0.02em]">Link expirado</h1>
			<p class="mb-[18px] text-[13.5px] leading-relaxed text-base-content/65">
				Este link já foi usado ou passou de 1 hora. Peça um novo para continuar.
			</p>
			<a
				href={resolve('/(auth)/esqueci-senha')}
				class="btn min-h-[46px] w-full motion-tap btn-outline font-bold no-underline"
			>
				Pedir novo link
			</a>
		</div>
	{:else}
		<h1 class="mb-[18px] font-display text-[22px] font-semibold tracking-[-0.02em]">Nova senha</h1>
		<form class="grid gap-3.5" onsubmit={onSubmit}>
			<label class="block">
				<span class="mb-1.5 block text-[13px] font-semibold">Nova senha</span>
				<input
					name="password"
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
					bind:value={pw}
					class="input w-full"
				/>
			</label>
			<label class="block">
				<span class="mb-1.5 block text-[13px] font-semibold">Confirmar</span>
				<input
					type="password"
					autocomplete="new-password"
					required
					bind:value={confirm}
					class="input w-full"
				/>
				{#if match}
					<span class="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-success">
						<svg class="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M4 12.5l5 5L20 6.5"
								stroke="currentColor"
								stroke-width="2.6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						As senhas conferem
					</span>
				{/if}
			</label>
			<button
				type="submit"
				disabled={!match || loading}
				class="mt-1 btn min-h-[46px] w-full motion-tap btn-primary font-bold"
			>
				{#if loading}
					<Loading variant="fila" size={13} tone="current" label="Salvando" />
					Salvando…
				{:else}
					Salvar e entrar
				{/if}
			</button>
		</form>
	{/if}
</div>
