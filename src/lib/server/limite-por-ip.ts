/**
 * Limite de pedidos por chave (normalmente o IP), na memória do processo web.
 * Mesma escolha de `asr/pre-transcricao.ts`: o compose sobe UM processo web, e
 * se um dia houver dois o pior caso é cada um contar a sua metade — o limite
 * fica frouxo, nunca trava quem não devia.
 *
 * Existe para o formulário de contato não virar porta de spam: cada mensagem
 * vira um e-mail para a equipe, e o plano grátis do Resend dá 100 por DIA —
 * um robô gastaria a cota e travaria os convites dos alunos.
 */

interface Janela {
	contagem: number;
	reiniciaEm: number;
}

/** Teto de chaves lembradas: uma rajada de IPs novos não cresce a memória sem fim. */
const TETO_DE_CHAVES = 5_000;

export function criarLimite(opcoes: { maximo: number; janelaMs: number }) {
	const janelas = new Map<string, Janela>();

	return {
		/** Conta um pedido. Devolve falso quando a chave passou do máximo na janela. */
		permitir(chave: string, agora = Date.now()): boolean {
			const atual = janelas.get(chave);
			if (!atual || atual.reiniciaEm <= agora) {
				if (janelas.size >= TETO_DE_CHAVES) {
					for (const [k, v] of janelas) if (v.reiniciaEm <= agora) janelas.delete(k);
					if (janelas.size >= TETO_DE_CHAVES) janelas.delete(janelas.keys().next().value!);
				}
				janelas.set(chave, { contagem: 1, reiniciaEm: agora + opcoes.janelaMs });
				return true;
			}
			atual.contagem++;
			return atual.contagem <= opcoes.maximo;
		}
	};
}
