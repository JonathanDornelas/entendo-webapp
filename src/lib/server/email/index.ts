/**
 * Envio de e-mail. `EMAIL_PROVIDER=smtp` manda de verdade; vazio registra no
 * log e não finge que mandou.
 *
 * Nada acima deste arquivo sabe qual serviço está por trás. Os e-mails são o
 * convite do aluno, o convite de módulo, o convite de escola e o aviso à equipe
 * — todos montados sobre `base.ts`.
 *
 * `process.env` e NÃO `$env/dynamic/private`: o worker importa este módulo
 * fora do SvelteKit, e o alias `$env` não existe lá — mesma razão do
 * `server/tts`.
 */

export interface EmailParaEnviar {
	to: string;
	subject: string;
	/** Linha de pré-visualização na caixa de entrada. */
	preheader: string;
	html: string;
	text: string;
	/**
	 * Para onde vai a resposta. Usado no aviso à equipe (formulário de contato,
	 * pedido de plano): quem lê responde direto a quem escreveu, sem copiar o
	 * endereço do corpo da mensagem.
	 */
	replyTo?: string;
}

export interface EmailProvider {
	send(email: EmailParaEnviar): Promise<void>;
}

// Depois da interface de propósito: `smtp-provider.ts` a importa daqui, e o
// import no topo do arquivo faria um ciclo em tempo de carga.
import { smtpEmailProvider } from './smtp-provider';

/**
 * Sem provedor configurado o e-mail vai para o log do servidor, com o link
 * inteiro. Em dev isso é o suficiente para percorrer o fluxo do aluno; em
 * produção o job falha e aparece em `failed`, que é o comportamento certo —
 * "nunca some em silêncio" (server.md "Fila").
 */
const logProvider: EmailProvider = {
	async send(email) {
		console.info(
			`[email] para=${email.to} assunto="${email.subject}"\n${email.text.replace(/^/gm, '  ')}`
		);
	}
};

export function isEmailConfigured(): boolean {
	return !!process.env.EMAIL_PROVIDER;
}

export function getEmailProvider(): EmailProvider {
	const nome = process.env.EMAIL_PROVIDER;
	if (!nome || nome === 'log') return logProvider;
	if (nome === 'smtp') return smtpEmailProvider;
	// Falhar aqui é melhor do que cair no log achando que enviou.
	throw new Error(`EMAIL_PROVIDER="${nome}" não tem implementação. Use "smtp" ou "log".`);
}
