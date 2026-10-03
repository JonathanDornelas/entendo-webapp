<script lang="ts">
	import { resolve } from '$app/paths';
	import Loading from '$lib/components/Loading.svelte';
	import { authClient } from '$lib/client/auth';

	// A confirmação é NEUTRA — "se esse e-mail existir". Não vaza quem tem conta.
	let email = $state('');
	let sent = $state(false);
	let loading = $state(false);
	let cooldown = $state(0);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		// Better Auth não distingue e-mail existente de inexistente na resposta —
		// a UI trata os dois como "enviado" de propósito, mesma regra da tela de entrar.
		await authClient.requestPasswordReset({
			email,
			redirectTo: resolve('/(auth)/redefinir-senha')
		});
		loading = false;
		sent = true;
		startCooldown();
	}

	function startCooldown() {
		cooldown = 45;
		const t = setInterval(() => {
			cooldown = cooldown > 0 ? cooldown - 1 : 0;
			if (cooldown === 0) clearInterval(t);
		}, 1000);
	}

	async function resend() {
		if (cooldown > 0) return;
		await authClient.requestPasswordReset({
			email,
			redirectTo: resolve('/(auth)/redefinir-senha')
		});
		startCooldown();
	}
</script>

<svelte:head><title>Recuperar acesso — entendo</title></svelte:head>

<div
	class="w-full max-w-[384px] animate-[en-fade-up_560ms_var(--ease-out-soft)_both] rounded-box
	       border border-line bg-base-100 p-8 shadow-[0_24px_56px_-34px_rgb(var(--shadow)/0.35)]"
>
	{#if sent}
		<div class="text-center">
			<span
				class="mb-4 inline-grid size-[52px] place-items-center rounded-full bg-base-300 text-primary"
			>
				<svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<rect
						x="2.5"
						y="5"
						width="19"
						height="14"
						rx="3"
						stroke="currentColor"
						stroke-width="2"
					/>
					<path
						d="M3.5 6.5l8.5 6.5 8.5-6.5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linejoin="round"
					/>
				</svg>
			</span>
			<h1 class="mb-2 font-display text-xl font-semibold tracking-[-0.02em]">
				Verifique seu e-mail
			</h1>
			<p class="mb-4 text-[13.5px] leading-relaxed text-base-content/65">
				Se esse e-mail existir, enviamos um link. O link vale por 1 hora.
			</p>
			<div class="border-t border-line pt-3.5 text-[12.5px] text-base-content/65">
				Não chegou?
				{#if cooldown > 0}
					<span class="font-bold">Reenviar em 0:{String(cooldown).padStart(2, '0')}</span>
				{:else}
					<button type="button" onclick={resend} class="font-bold text-primary">Reenviar</button>
				{/if}
			</div>
		</div>
	{:else}
		<h1 class="mb-1.5 font-display text-[22px] font-semibold tracking-[-0.02em]">
			Recuperar acesso
		</h1>
		<p class="mb-[18px] text-[13.5px] leading-snug text-base-content/65">
			Enviamos um link de redefinição para o seu e-mail.
		</p>
		<form class="grid gap-3.5" onsubmit={onSubmit}>
			<label class="block">
				<span class="mb-1.5 block text-[13px] font-semibold">E-mail</span>
				<input
					name="email"
					type="email"
					autocomplete="email"
					required
					bind:value={email}
					class="input w-full"
				/>
			</label>
			<button
				type="submit"
				disabled={loading}
				class="btn min-h-[46px] w-full motion-tap btn-primary font-bold"
			>
				{#if loading}
					<Loading variant="fila" size={13} tone="current" label="Enviando" />
					Enviando…
				{:else}
					Enviar link
				{/if}
			</button>
		</form>
		<p class="mt-4 text-center text-[13px]">
			<a href={resolve('/(auth)/entrar')}>Voltar para entrar</a>
		</p>
	{/if}
</div>
