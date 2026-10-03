import type { PageServerLoad } from './$types';
import { can } from '$lib/server/billing/entitlements';
import { planos, type PlanoId } from '$lib/content/planos';

/**
 * A tela de planos. Ela é DOIS lugares ao mesmo tempo:
 *
 * 1. A página pública de preços, para quem quer comparar antes de assinar.
 * 2. **O destino de quem bateu numa porta fechada** — tentou publicar sem
 *    assinatura, pediu material com IA, abriu uma funcionalidade que o plano
 *    dele não cobre. Aí ela chega com `?motivo=`, e a primeira coisa na tela é
 *    a resposta para "por que eu vim parar aqui", não a tabela.
 *
 * Sem essa explicação a pessoa cai numa página de preços sem entender o que
 * pediu, e a leitura mais natural é a pior: "o produto quebrou e me jogou na
 * cobrança".
 *
 * **`motivo` é validado contra uma LISTA FECHADA**, como o `?voltar=` da prévia
 * (paginas.md "Studio"): um parâmetro de query que vira texto na tela é texto
 * que qualquer pessoa escolhe: aceitar livre seria deixar um link forjado
 * escrever a frase que quisesse numa página nossa.
 */
const MOTIVOS = {
	publicar: {
		titulo: 'Publicar precisa de uma assinatura ativa',
		texto:
			'A atividade continua salva como rascunho — nada do que você montou foi perdido. O que falta é a assinatura para gerar o link da turma.'
	},
	criar: {
		titulo: 'Você chegou ao limite de atividades do seu plano',
		texto:
			'As atividades que já estão no ar seguem recebendo respostas. Para montar uma nova, escolha um plano abaixo.'
	},
	ia: {
		titulo: 'Gerar material com IA é do plano Professor',
		texto:
			'Digitar e colar a lista continuam liberados em qualquer plano — o que muda é a IA montar o material a partir de um prompt, de uma imagem ou de um vídeo.'
	},
	escuta: {
		titulo: 'Questões de escuta precisam do áudio gerado',
		texto:
			'O áudio é sintetizado por atividade, e é isso que o plano cobre. Sem ele a atividade continua funcionando — ela só não tem questão de escuta.'
	},
	turmas: {
		titulo: 'Este recurso de turma é de um plano maior',
		texto:
			'Suas turmas e seus convites continuam como estão. O que falta é o recurso da coordenação, que vem no plano Escola.'
	}
} as const;

export type MotivoDoBloqueio = keyof typeof MOTIVOS;

function motivoValido(valor: string | null): MotivoDoBloqueio | null {
	return valor && valor in MOTIVOS ? (valor as MotivoDoBloqueio) : null;
}

/**
 * Qual dos nossos planos é o da conta. Devolve nulo quase sempre, e isso é
 * correto: `Teacher.plan` guarda o vocabulário do PROVEDOR, e o mapeamento
 * provedor → plano nosso não existe enquanto a cobrança não existe (billing.md).
 * Só casa quando o valor é literalmente um dos nossos ids.
 *
 * Nulo faz a tabela não marcar nada como "seu plano agora" — melhor não dizer
 * do que dizer errado a alguém que está decidindo o que pagar.
 */
function planoDaConta(plan: string | null | undefined): PlanoId | null {
	const achado = planos.find((p) => p.id === plan);
	return achado ? achado.id : null;
}

export const load: PageServerLoad = ({ locals, url }) => {
	// Rota PÚBLICA: `locals.user` pode ser nulo, e é o caso mais comum aqui.
	// Quem está logado ganha o cartão do próprio plano marcado; quem não está vê
	// a tabela limpa. Nada nesta tela depende de sessão para funcionar.
	const teacher = locals.user;

	return {
		motivo: motivoValido(url.searchParams.get('motivo')),
		motivos: MOTIVOS,
		planoAtual: teacher ? planoDaConta(teacher.plan) : null,
		/**
		 * Está logado e JÁ pode publicar? Então ele não bateu em porta nenhuma —
		 * a tela troca o convite de assinar por um caminho de volta ao Studio,
		 * em vez de vender o que ele já tem.
		 */
		jaAssinante: teacher ? can(teacher, 'publicar_atividade') : false,
		logado: !!teacher
	};
};
