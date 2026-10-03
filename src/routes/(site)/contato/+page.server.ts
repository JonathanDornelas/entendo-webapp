import type { Actions } from './$types';

// Provedor de e-mail ainda indefinido (CLAUDE.md "Pendências") — até existir
// um real, a mensagem só é logada no console do servidor. Sem persistência
// nem rate limit ainda: ver paginas.md "Grupo (site)", pendência conhecida.
export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const nome = String(data.get('nome') ?? '');
		const email = String(data.get('email') ?? '');
		const assunto = String(data.get('assunto') ?? '');
		const mensagem = String(data.get('mensagem') ?? '');

		if (!nome || !email || !mensagem) {
			return { ok: false, error: 'Preencha nome, e-mail e mensagem.' };
		}

		console.log(`[contato] ${assunto} — ${nome} <${email}>: ${mensagem}`);

		return { ok: true };
	}
};
