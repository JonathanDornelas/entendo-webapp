/**
 * Os planos, num arquivo só — o texto nunca fica solto numa rota (paginas.md
 * "Grupo (site)"). A home e `/planos` leem daqui, então preço e nome de plano
 * nunca podem divergir entre as duas.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ OS PREÇOS SÃO PLACEHOLDER. Nome de plano, valor, ciclo, o que cada   │
 * │ um libera e a duração do trial NÃO FORAM DECIDIDOS — são pendência   │
 * │ de produto (CLAUDE.md "Pendências", billing.md). O que está aqui é   │
 * │ mock para a tela existir e ser navegável.                           │
 * │                                                                      │
 * │ Nada disto está ligado à cobrança: não existe produto no provedor,   │
 * │ e `can()` (billing.md "Entitlements") continua sendo o único ponto   │
 * │ de decisão de acesso — ele não lê este arquivo. Trocar um valor      │
 * │ aqui muda o que a tela MOSTRA, nunca o que a conta PODE fazer.       │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Antes de publicar: revisar com quem decide preço, e ligar os ids aos
 * produtos do provedor no `BillingProvider`.
 */

/** Marca para o desenvolvedor: nenhum número deste arquivo foi aprovado. */
export const PRECOS_SAO_PLACEHOLDER = true;

export type CicloDeCobranca = 'mensal' | 'anual';

/** Os ids são internos — o mapeamento para o provedor ainda não existe. */
export type PlanoId = 'livre' | 'professor' | 'escola';

export interface Recurso {
	label: string;
	/** Falso desenha o traço apagado, não um X vermelho: é ausência, não erro. */
	incluso: boolean;
}

export interface Plano {
	id: PlanoId;
	nome: string;
	/** Para quem é, em três palavras. Vai sob o nome. */
	para: string;
	/** Ícone: `spark` | `person` | `school` — a tela escolhe o desenho. */
	icone: 'spark' | 'person' | 'school';
	/** Preço por ciclo, já formatado — é texto de tela, não número de conta. */
	preco: Record<CicloDeCobranca, string>;
	/** A unidade ao lado do preço: "por mês", "por professor / mês". */
	unidade: string;
	/** A letra miúda do preço. Muda com o ciclo quando o anual tem outra regra. */
	nota: Record<CicloDeCobranca, string>;
	listaTitulo: string;
	recursos: Recurso[];
	cta: string;
	/** A linha sob o botão — o que acontece depois de clicar. */
	ctaNota: string;
	/** Um só por tabela: o plano em destaque. */
	destaque?: string;
}

export const planos: readonly Plano[] = [
	{
		id: 'livre',
		nome: 'Livre',
		para: 'para experimentar',
		icone: 'spark',
		preco: { mensal: 'R$ 0', anual: 'R$ 0' },
		unidade: 'para sempre',
		nota: {
			mensal: 'Sem cartão. Você monta uma atividade por mês e ela fica no ar sem prazo.',
			anual: 'Sem cartão. Você monta uma atividade por mês e ela fica no ar sem prazo.'
		},
		listaTitulo: 'O que você pode fazer',
		recursos: [
			{ label: '1 atividade nova por mês', incluso: true },
			{ label: 'Turmas e convites por e-mail sem limite', incluso: true },
			{ label: 'Resultados por aluno e por questão', incluso: true },
			{ label: 'Materiais gerados com IA', incluso: false },
			{ label: 'Questões de escuta com áudio', incluso: false }
		],
		cta: 'Começar sem cartão',
		ctaNota: 'Dá para subir de plano depois sem perder nada do que você já criou.'
	},
	{
		id: 'professor',
		nome: 'Professor',
		para: 'para quem dá aula toda semana',
		icone: 'person',
		preco: { mensal: 'R$ 39', anual: 'R$ 32,50' },
		unidade: 'por mês',
		nota: {
			mensal: 'Cobrado mensalmente. Cancela quando quiser, sem multa.',
			anual: 'R$ 390 por ano, cobrados de uma vez. Equivale a dez meses.'
		},
		listaTitulo: 'Tudo do Livre, mais',
		recursos: [
			{ label: 'Atividades ilimitadas', incluso: true },
			{ label: 'Materiais com IA: prompt, imagem ou vídeo', incluso: true },
			{ label: 'Áudio gerado para questões de escuta', incluso: true },
			{ label: 'Biblioteca de materiais reaproveitáveis', incluso: true },
			{ label: 'Correção automática com nota parcial', incluso: true }
		],
		cta: 'Assinar o Professor',
		// A duração do trial é pendência (billing.md): a frase fica reservada.
		ctaNota: 'Período de teste antes da primeira cobrança.',
		destaque: 'O mais escolhido'
	},
	{
		id: 'escola',
		nome: 'Escola',
		para: 'para um grupo de professores',
		icone: 'school',
		preco: { mensal: 'R$ 29', anual: 'R$ 24' },
		unidade: 'por professor / mês',
		nota: {
			mensal: 'A partir de 5 professores. Uma fatura só, no nome da escola.',
			anual: 'A partir de 5 professores. Uma fatura só, no nome da escola.'
		},
		listaTitulo: 'Tudo do Professor, mais',
		recursos: [
			{ label: 'Materiais compartilhados entre professores', incluso: true },
			{ label: 'Turmas visíveis para a coordenação', incluso: true },
			{ label: 'Uma fatura só, com nota fiscal', incluso: true },
			{ label: 'Entrada de alunos em lote', incluso: true },
			{ label: 'Suporte por e-mail em até um dia útil', incluso: true }
		],
		cta: 'Falar sobre a escola',
		ctaNota: 'A gente responde com uma proposta pelo número de professores.'
	}
];

/** O que não muda de plano — vai no rodapé da tabela. */
export const garantias: readonly string[] = [
	'Cancela quando quiser',
	'Links publicados nunca saem do ar',
	'Nota fiscal em todos os planos'
];

export const tituloPadrao = 'Um preço por professor, sem cobrar do aluno';
export const ledePadrao =
	'O que muda entre os planos é quanto você cria e quanto a IA te ajuda. O que os alunos veem é igual nos três.';

/**
 * A promessa que vale em qualquer plano, e que é desenho de produto e não
 * cortesia: a cobrança mexe no lado do PROFESSOR. Está aqui porque a home e a
 * tela de planos dizem a mesma coisa — e porque é a regra que `can()` implementa
 * (billing.md "Degradação, não desligamento").
 */
export const alunoNaoPaga = {
	titulo: 'O aluno nunca paga, nem precisa de conta',
	texto:
		'Em qualquer plano, quem responde entra pelo link, pelo QR ou pelo código. Se a sua cobrança atrasar, as atividades já publicadas continuam abrindo e recebendo respostas — o que trava é criar e publicar, do seu lado.'
};

/** No anual, dois meses saem de graça — o selo ao lado do seletor de ciclo. */
export const vantagemDoAnual = 'No anual, dois meses saem de graça';
