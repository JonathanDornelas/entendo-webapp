/**
 * SEED DE DEMONSTRAÇÃO — enche a conta de UM professor com um semestre de mentira:
 * materiais, atividades publicadas (e um rascunho), turmas com alunos, módulos com
 * programação de envio, envios que já saíram e tentativas de aluno respondidas.
 *
 *   pnpm db:seed:demo <email-do-professor>            (re)cria o cenário
 *   pnpm db:seed:demo <email-do-professor> --limpar   só apaga o que o seed criou
 *
 * Só para desenvolvimento: recusa rodar com NODE_ENV=production. A conta precisa
 * existir (crie em /cadastro). Nada do que o professor cadastrou à mão é tocado.
 *
 * **Como ele se reconhece**: toda linha de topo que ele cria (atividade, material,
 * turma, módulo, conta de aluno) tem o id começando por `seed` + seis letras do id
 * do professor. Um cuid de verdade começa sempre por "c", então a marca não colide
 * com nada; o resto (versão, item, aluno, envio, convite, tentativa) sai em cascata
 * ou pela relação com essas linhas. Rodar de novo apaga o cenário anterior antes —
 * as datas são relativas a HOJE, então ele sempre parece recente.
 *
 * **Não manda e-mail nem enfileira nada.** Os alunos têm e-mail em `exemplo.invalid`,
 * domínio reservado que não entrega para ninguém (RFC 6761); o histórico de envio é
 * gravado já "enviado", e os envios FUTUROS dos módulos ficam programados sem job na
 * fila — eles só disparam se o professor salvar a programação de novo pela tela.
 *
 * **Tudo passa pelo produto onde importa**: as questões saem dos geradores do
 * kernel e do mesmo corte do wizard (`runGenerators` + `selectItems`), a
 * publicação e os convites pelos repositórios, e cada resposta de aluno é montada
 * sobre o `toRuntime` do item e CORRIGIDA pelo grader de verdade — a nota gravada
 * é a que o Player daria. Sem serviço de áudio, não há questão de escuta nem de fala.
 */
import 'dotenv/config';
import type { Prisma } from '../generated/prisma/client.ts';
import { prisma } from '../src/lib/server/db/client.ts';
import { atividades } from '../src/lib/server/db/repos/activities.ts';
import { materiais } from '../src/lib/server/db/repos/content-units.ts';
import { envios } from '../src/lib/server/db/repos/deliveries.ts';
import { modulos } from '../src/lib/server/db/repos/modules.ts';
import { programacoes } from '../src/lib/server/db/repos/programacoes.ts';
import { linkDaAtividade } from '../src/lib/server/player/slug.ts';
import { transcritorPara } from '../src/lib/server/escrita/index.ts';
import { runGenerators } from '../src/lib/kernel/generators/index.ts';
import { selectItems } from '../src/lib/kernel/generators/select.ts';
import { getProfile } from '../src/lib/kernel/language/profiles/index.ts';
import { getInteraction } from '../src/lib/kernel/interactions/registry.ts';
import { gradingSchema, interactionSchema, localeSchema } from '../src/lib/kernel/item.ts';
import { contentUnitSchemas, type ContentUnitKind } from '../src/lib/kernel/content/types.ts';
import {
	agendar,
	hojeEmBrasilia,
	instanteDe,
	programacaoSchema,
	somarDias,
	type Programacao
} from '../src/lib/modulos/programacao.ts';
import { segundaDaSemana } from '../src/lib/inicio/semana.ts';
import { sortearCodigo } from '../src/lib/avatar/montar.ts';
import type { CorDeEtiqueta } from '../src/lib/etiquetas.ts';

// ── entrada ────────────────────────────────────────────────────────────────

const [email, opcao] = process.argv.slice(2);
if (process.env.NODE_ENV === 'production') {
	console.error('O seed de demonstração não roda em produção.');
	process.exit(1);
}
if (!email || email.startsWith('--')) {
	console.error('Uso: pnpm db:seed:demo <email-do-professor> [--limpar]');
	process.exit(1);
}

const professor = await prisma.teacher.findUnique({
	where: { email },
	select: { id: true, name: true }
});
if (!professor) {
	console.error(`Nenhum professor com o e-mail ${email}. Crie a conta em /cadastro antes.`);
	process.exit(1);
}
const teacher = { id: professor.id, name: professor.name };
const MARCA = `seed${professor.id
	.toLowerCase()
	.replace(/[^a-z0-9]/g, '')
	.slice(0, 6)}`;

/** Um id com a marca do seed — só minúsculas e dígitos, porque o da atividade vira o link. */
function idDoSeed(): string {
	return MARCA + crypto.randomUUID().replace(/-/g, '').slice(0, 14);
}

// ── acaso, com semente: rodar duas vezes dá o mesmo cenário ────────────────

let estado = 0x5eed2026;
function acaso(): number {
	estado = (estado + 0x6d2b79f5) | 0;
	let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (min: number, max: number) => min + acaso() * (max - min);
const algum = <T>(lista: readonly T[]): T => lista[Math.floor(acaso() * lista.length)];

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;
const agora = new Date();
const hoje = hojeEmBrasilia(agora);
const atras = (dias: number, hora = 10) =>
	new Date(instanteDe(somarDias(hoje, -dias), `${String(hora).padStart(2, '0')}:00`));

// ── limpar ─────────────────────────────────────────────────────────────────

/**
 * Apaga o cenário anterior, na ordem dos três RESTRICT (db.md "Apagar uma
 * atividade de vez"): tentativas, publicações, e só então atividades. Módulo
 * antes de atividade, turma leva alunos, envios e convites em cascata.
 */
async function limpar(): Promise<void> {
	const marca = { startsWith: MARCA };
	const daMarca = { activity: { teacherId: teacher.id, id: marca } };
	const tentativas = await prisma.attempt.deleteMany({
		where: { publication: { activityVersion: daMarca } }
	});
	await prisma.publication.deleteMany({ where: { activityVersion: daMarca } });
	const mods = await prisma.module.deleteMany({ where: { teacherId: teacher.id, id: marca } });
	const ativs = await prisma.activity.deleteMany({ where: { teacherId: teacher.id, id: marca } });
	const turmasApagadas = await prisma.classroom.deleteMany({
		where: { teacherId: teacher.id, id: marca }
	});
	const mats = await prisma.contentUnit.deleteMany({ where: { teacherId: teacher.id, id: marca } });
	await prisma.studentAccount.deleteMany({ where: { id: marca } });
	console.log(
		`Cenário anterior apagado: ${ativs.count} atividades, ${mats.count} materiais, ` +
			`${turmasApagadas.count} turmas, ${mods.count} módulos, ${tentativas.count} tentativas.`
	);
}

await limpar();
if (opcao === '--limpar') {
	await prisma.$disconnect();
	process.exit(0);
}

// ── o conteúdo ─────────────────────────────────────────────────────────────

type Material = { kind: ContentUnitKind; data: unknown };
const par = (source: string, target: string): Material => ({
	kind: 'SentencePair',
	data: { source, target }
});
const vocab = (term: string, translation: string, example: string): Material => ({
	kind: 'VocabItem',
	data: { term, translation, example }
});

type Plano = {
	chave: string;
	titulo: string;
	idioma: string;
	nivel: string;
	publicar: boolean;
	/** Há quantos dias foi criada — a publicação sai no dia seguinte. */
	criadaHa: number;
	questoes: number;
	materiais: Material[];
};

const PLANOS: Plano[] = [
	{
		chave: 'frutas1',
		titulo: 'Frutas 1 — vocabulário',
		idioma: 'en-US',
		nivel: 'A1',
		publicar: true,
		criadaHa: 24,
		questoes: 10,
		materiais: [
			vocab('apple', 'maçã', 'An apple a day keeps the doctor away.'),
			vocab('banana', 'banana', 'Monkeys love bananas.'),
			vocab('orange', 'laranja', 'I drink orange juice every morning.'),
			vocab('grape', 'uva', 'These grapes are sweet.'),
			vocab('strawberry', 'morango', 'She likes strawberry ice cream.'),
			vocab('pineapple', 'abacaxi', 'Pineapple is a tropical fruit.'),
			vocab('watermelon', 'melancia', 'Watermelon is perfect for summer.'),
			vocab('lemon', 'limão', 'Lemons are sour.'),
			vocab('pear', 'pera', 'The pear is not ripe yet.'),
			vocab('mango', 'manga', 'My grandmother has a mango tree.')
		]
	},
	{
		chave: 'frutas2',
		titulo: 'Frutas 2 — na feira',
		idioma: 'en-US',
		nivel: 'A1',
		publicar: true,
		criadaHa: 22,
		questoes: 10,
		materiais: [
			par('Quanto custa um quilo de maçã?', 'How much is a kilo of apples?'),
			par('Eu quero seis bananas, por favor.', 'I want six bananas, please.'),
			par('As uvas estão muito doces hoje.', 'The grapes are very sweet today.'),
			par('Você tem morangos frescos?', 'Do you have fresh strawberries?'),
			par('A melancia é grande demais.', 'The watermelon is too big.'),
			par('Pode colocar numa sacola?', 'Can you put it in a bag?'),
			par('Você aceita cartão?', 'Do you take cards?'),
			par('Obrigado, até a semana que vem.', 'Thank you, see you next week.')
		]
	},
	{
		// O RASCUNHO do cenário: o envio do 7º B que esperava por ela "não saiu".
		chave: 'frutas3',
		titulo: 'Frutas 3 — receita',
		idioma: 'en-US',
		nivel: 'A2',
		publicar: false,
		criadaHa: 9,
		questoes: 8,
		materiais: [
			par('Corte a manga em cubos.', 'Cut the mango into cubes.'),
			par('Esprema dois limões.', 'Squeeze two lemons.'),
			par('Misture o açúcar com a fruta.', 'Mix the sugar with the fruit.'),
			par('Leve à geladeira por uma hora.', 'Put it in the fridge for an hour.'),
			par('Sirva com gelo.', 'Serve it with ice.'),
			par('A salada de frutas está pronta.', 'The fruit salad is ready.')
		]
	},
	{
		chave: 'frutas4',
		titulo: 'Frutas 4 — diálogo',
		idioma: 'en-US',
		nivel: 'A2',
		publicar: true,
		criadaHa: 16,
		questoes: 8,
		materiais: [
			{
				kind: 'Dialogue',
				data: {
					lines: [
						{ speaker: 'Seller', text: 'Good morning! What would you like?' },
						{ speaker: 'Customer', text: "Good morning. I'd like some oranges." },
						{ speaker: 'Seller', text: 'How many?' },
						{ speaker: 'Customer', text: 'A dozen, please.' },
						{ speaker: 'Seller', text: "That's eight dollars." },
						{ speaker: 'Customer', text: 'Here you go. Thank you!' }
					]
				}
			},
			par('Bom dia! O que você gostaria?', 'Good morning! What would you like?'),
			par('Eu gostaria de algumas laranjas.', "I'd like some oranges."),
			par('Uma dúzia, por favor.', 'A dozen, please.'),
			par('São oito dólares.', "That's eight dollars.")
		]
	},
	{
		chave: 'rotina1',
		titulo: 'Rotina 1 — present simple',
		idioma: 'en-US',
		nivel: 'A1',
		publicar: true,
		criadaHa: 18,
		questoes: 10,
		materiais: [
			par('Eu acordo às seis e meia.', 'I wake up at six thirty.'),
			par('Ela toma café da manhã com a família.', 'She has breakfast with her family.'),
			par('Nós vamos para a escola de ônibus.', 'We go to school by bus.'),
			par('Ele não trabalha aos sábados.', "He doesn't work on Saturdays."),
			par('Você estuda à noite?', 'Do you study at night?'),
			par('Meu irmão joga futebol depois da aula.', 'My brother plays soccer after class.'),
			par('Eles jantam às oito.', 'They have dinner at eight.'),
			par('Eu vou dormir às dez e meia.', 'I go to bed at ten thirty.')
		]
	},
	{
		chave: 'rotina2',
		titulo: 'Rotina 2 — horários',
		idioma: 'en-US',
		nivel: 'A2',
		publicar: true,
		criadaHa: 12,
		questoes: 9,
		materiais: [
			{
				kind: 'Passage',
				data: {
					title: "A day in Tom's life",
					text:
						'Tom is a nurse. He wakes up at five o’clock and takes the train to the hospital. ' +
						'He works from seven to three. In the afternoon, he goes to the gym. ' +
						'He has dinner at seven and reads a book before bed.',
					questions: [
						{ question: 'What does Tom do?', answer: 'He is a nurse.' },
						{ question: 'How does he go to work?', answer: 'By train.' },
						{ question: 'What does he do in the afternoon?', answer: 'He goes to the gym.' }
					]
				}
			},
			par('Que horas são?', 'What time is it?'),
			par('São três e quinze.', "It's a quarter past three."),
			par('A aula começa às oito.', 'Class starts at eight.'),
			par('O filme termina à meia-noite.', 'The movie ends at midnight.')
		]
	},
	{
		chave: 'viagem1',
		titulo: 'Viagem 1 — no aeroporto',
		idioma: 'en-US',
		nivel: 'B1',
		publicar: true,
		criadaHa: 20,
		questoes: 9,
		materiais: [
			par('Onde fica o portão doze?', 'Where is gate twelve?'),
			par('Meu voo está atrasado.', 'My flight is delayed.'),
			par('Posso ver seu passaporte?', 'Can I see your passport?'),
			par('Eu tenho uma mala para despachar.', 'I have one bag to check.'),
			par('Janela ou corredor?', 'Window or aisle?'),
			par('O embarque começa às nove.', 'Boarding starts at nine.'),
			par('Perdi meu cartão de embarque.', 'I lost my boarding pass.')
		]
	},
	{
		chave: 'viagem2',
		titulo: 'Viagem 2 — no hotel',
		idioma: 'en-US',
		nivel: 'B1',
		publicar: true,
		criadaHa: 14,
		questoes: 8,
		materiais: [
			par('Tenho uma reserva em nome de Silva.', 'I have a reservation under Silva.'),
			par('A que horas é o café da manhã?', 'What time is breakfast?'),
			par('O ar-condicionado não funciona.', "The air conditioning doesn't work."),
			par('Pode chamar um táxi?', 'Can you call a taxi?'),
			par('Qual é a senha do wi-fi?', "What's the wi-fi password?"),
			par('Vou fazer o check-out amanhã.', "I'm checking out tomorrow.")
		]
	},
	{
		chave: 'espanhol1',
		titulo: 'Español 1 — saludos',
		idioma: 'es-ES',
		nivel: 'A1',
		publicar: true,
		criadaHa: 11,
		questoes: 8,
		materiais: [
			par('Bom dia, tudo bem?', 'Buenos días, ¿qué tal?'),
			par('Meu nome é Ana.', 'Me llamo Ana.'),
			par('Prazer em conhecer você.', 'Encantada de conocerte.'),
			par('De onde você é?', '¿De dónde eres?'),
			par('Eu sou do Brasil.', 'Soy de Brasil.'),
			par('Até amanhã!', '¡Hasta mañana!')
		]
	},
	{
		chave: 'japones1',
		titulo: 'Japonês 1 — cumprimentos',
		idioma: 'ja-JP',
		nivel: 'A1',
		publicar: true,
		criadaHa: 8,
		questoes: 8,
		materiais: [
			par('Bom dia.', 'おはようございます。'),
			par('Muito obrigado.', 'ありがとうございます。'),
			par('Meu nome é Ana.', 'わたしはアナです。'),
			par('Prazer em conhecer.', 'はじめまして。'),
			par('Até mais.', 'またね。')
		]
	}
];

type Aluno = { nome: string; email: boolean; conta?: boolean };
type PlanoDeTurma = {
	chave: string;
	nome: string;
	idioma: string;
	cor: CorDeEtiqueta;
	criadaHa: number;
	alunos: Aluno[];
};

/** Um em cada quatro sem e-mail — "Sem e-mail" é estado normal da chamada, não erro. */
const chamada = (nomes: string[], contas: string[] = []): Aluno[] =>
	nomes.map((nome, i) => ({ nome, email: i % 4 !== 3, conta: contas.includes(nome) }));

const TURMAS: PlanoDeTurma[] = [
	{
		chave: '7b',
		nome: '7º B — inglês',
		idioma: 'en-US',
		cor: 'violeta',
		criadaHa: 30,
		alunos: chamada(
			[
				'Ana Ribeiro',
				'Davi Moreira',
				'Lia Tanaka',
				'Pedro Alves',
				'Beatriz Lima',
				'Caio Martins',
				'Clara Nogueira',
				'Enzo Ferreira',
				'Helena Duarte',
				'Isaac Barros',
				'Laura Mendes',
				'Miguel Rocha',
				'Sofia Teixeira',
				'Theo Campos'
			],
			['Ana Ribeiro', 'Davi Moreira', 'Lia Tanaka']
		)
	},
	{
		chave: '8a',
		nome: '8º A — inglês',
		idioma: 'en-US',
		cor: 'teal',
		criadaHa: 29,
		alunos: chamada(
			[
				'Júlia Costa',
				'Rafael Lima',
				'Bianca Souza',
				'Arthur Pinto',
				'Giovana Reis',
				'Heitor Freitas',
				'Isabela Moura',
				'João Pedro Dias',
				'Larissa Gomes',
				'Matheus Cardoso',
				'Nicole Araújo',
				'Otávio Ramos'
			],
			['Júlia Costa', 'Rafael Lima', 'Giovana Reis']
		)
	},
	{
		chave: '9c',
		nome: '9º C — inglês',
		idioma: 'en-US',
		cor: 'azul',
		criadaHa: 28,
		alunos: chamada(
			[
				'Gabriel Santos',
				'Manuela Castro',
				'Lucas Oliveira',
				'Valentina Melo',
				'Bernardo Lopes',
				'Alice Carvalho',
				'Samuel Correia',
				'Lorena Batista',
				'Vinícius Farias',
				'Yasmin Cunha',
				'Felipe Monteiro'
			],
			['Gabriel Santos']
		)
	},
	{
		chave: 'esp',
		nome: 'Espanhol — turma da tarde',
		idioma: 'es-ES',
		cor: 'magenta',
		criadaHa: 15,
		alunos: chamada([
			'Marina Azevedo',
			'Rodrigo Pires',
			'Camila Vieira',
			'Diego Moraes',
			'Fernanda Rezende',
			'Gustavo Prado',
			'Paula Siqueira',
			'Renato Brito'
		])
	},
	{
		// A turma sem nenhum e-mail: o início avisa, e o link aberto continua valendo.
		chave: 'jp',
		nome: '1º EM — japonês (eletiva)',
		idioma: 'ja-JP',
		cor: 'ardosia',
		criadaHa: 10,
		alunos: ['Akemi Sato', 'Bruno Kato', 'Carla Yamada', 'Daniel Ito', 'Erika Mori'].map(
			(nome) => ({ nome, email: false })
		)
	}
];

/** "Júlia Costa" → "julia.costa@exemplo.invalid" — domínio que não entrega para ninguém. */
function emailDe(nome: string): string {
	const local = nome
		.normalize('NFD')
		.replace(/\p{Mn}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '.')
		.replace(/^\.|\.$/g, '');
	return `${local}@exemplo.invalid`;
}

// ── materiais e atividades ─────────────────────────────────────────────────

type ItemPublicado = {
	id: string;
	interaction: unknown;
	grading: unknown;
	locale: unknown;
};
type Atividade = {
	id: string;
	titulo: string;
	publicacao: { id: string; desde: Date } | null;
	itens: ItemPublicado[];
};

const repoAtiv = atividades(teacher);
const repoMat = materiais(teacher);
const atividadesCriadas = new Map<string, Atividade>();
let totalDeMateriais = 0;

for (const plano of PLANOS) {
	const criada = atras(plano.criadaHa, 9);
	const id = idDoSeed();
	await prisma.activity.create({
		data: {
			id,
			title: plano.titulo,
			sourceLang: 'pt-BR',
			targetLang: plano.idioma,
			itemTarget: plano.questoes,
			skills: ['listening', 'speaking', 'reading', 'writing'],
			level: plano.nivel,
			teacherId: teacher.id,
			createdAt: criada
		}
	});

	// O material é criado à parte (com a marca) e LIGADO à atividade: o
	// `createForActivity` reaproveitaria um material igual que o professor já
	// tivesse — e o seed, ao limpar, levaria junto um material que não é dele.
	for (const m of plano.materiais) {
		const contentId = idDoSeed();
		await prisma.contentUnit.create({
			data: {
				id: contentId,
				teacherId: teacher.id,
				kind: m.kind,
				data: contentUnitSchemas[m.kind].parse(m.data),
				targetLang: plano.idioma,
				createdAt: criada
			}
		});
		await repoMat.link(id, contentId);
		totalDeMateriais++;
	}

	// As questões, pelo mesmo caminho do "Gerar questões" do wizard.
	const units = await repoMat.byActivity(id);
	const targetProfile = getProfile(plano.idioma);
	const { groups, closing } = runGenerators(units, {
		targetProfile,
		sourceProfile: getProfile('pt-BR'),
		seed: id,
		capabilities: { asr: false, tts: false },
		transcrever: await transcritorPara(targetProfile)
	});
	const itens = selectItems(
		groups,
		{ target: plano.questoes, skills: ['listening', 'speaking', 'reading', 'writing'] },
		closing
	);
	// A versão nasce na data da atividade: "editada por último" no início lê a data dela.
	const versao = await repoAtiv.replaceDraftItems(id, itens);
	if (versao) {
		await prisma.activityVersion.update({ where: { id: versao.id }, data: { createdAt: criada } });
	}

	let publicacao: Atividade['publicacao'] = null;
	let publicados: ItemPublicado[] = [];
	if (plano.publicar) {
		const pub = await repoAtiv.publishDraft(id, linkDaAtividade(id), {
			requireCode: false,
			code: null,
			showResult: true
		});
		if (!pub) throw new Error(`Não deu para publicar ${plano.titulo}.`);
		const desde = new Date(criada.getTime() + DIA);
		await prisma.publication.update({ where: { id: pub.id }, data: { createdAt: desde } });
		publicacao = { id: pub.id, desde };
		publicados = await prisma.item.findMany({
			where: { activityVersionId: pub.activityVersionId },
			orderBy: { order: 'asc' },
			select: { id: true, interaction: true, grading: true, locale: true }
		});
	}
	await prisma.activity.update({ where: { id }, data: { updatedAt: criada } });
	atividadesCriadas.set(plano.chave, { id, titulo: plano.titulo, publicacao, itens: publicados });
}
const ativ = (chave: string): Atividade => {
	const a = atividadesCriadas.get(chave);
	if (!a) throw new Error(`Atividade ${chave} não existe no seed.`);
	return a;
};

// ── turmas, alunos e contas ────────────────────────────────────────────────

type AlunoCriado = { id: string; nome: string; nivel: number };
const turmasCriadas = new Map<string, { id: string; alunos: AlunoCriado[] }>();
let contas = 0;

for (const plano of TURMAS) {
	const id = idDoSeed();
	await prisma.classroom.create({
		data: {
			id,
			name: plano.nome,
			languageTag: plano.idioma,
			color: plano.cor,
			teacherId: teacher.id,
			createdAt: atras(plano.criadaHa, 14)
		}
	});
	const alunos: AlunoCriado[] = [];
	for (const a of plano.alunos) {
		// Os que têm conta escolheram um avatar — é o que aparece na chamada e nas tentativas.
		let accountId: string | null = null;
		if (a.conta) {
			accountId = idDoSeed();
			await prisma.studentAccount.create({
				data: {
					id: accountId,
					name: a.nome,
					email: `${MARCA}.${emailDe(a.nome)}`,
					avatar: sortearCodigo(acaso)
				}
			});
			contas++;
		}
		const aluno = await prisma.student.create({
			data: {
				name: a.nome,
				email: a.email ? emailDe(a.nome) : null,
				teacherId: teacher.id,
				classroomId: id,
				accountId,
				createdAt: atras(plano.criadaHa, 14)
			}
		});
		// O "jeito" do aluno: a chance de acertar cada questão.
		alunos.push({ id: aluno.id, nome: a.nome, nivel: entre(0.45, 0.95) });
	}
	turmasCriadas.set(plano.chave, { id, alunos });
}
const turma = (chave: string) => {
	const t = turmasCriadas.get(chave);
	if (!t) throw new Error(`Turma ${chave} não existe no seed.`);
	return t;
};

// ── respostas corrigidas pelo grader de verdade ────────────────────────────

type Alvo = 'certa' | 'quase' | 'errada';
type Opcao = { id: string; text: string };

/** Uma letra a menos no meio da palavra: o deslize que o `tolerant` chama de "quase". */
function comDeslize(texto: string): string {
	const letras = [...texto];
	if (letras.length < 4) return texto + letras[0];
	letras.splice(Math.floor(letras.length / 2), 1);
	return letras.join('');
}

/** Os ids do runtime na ordem de uma lista de textos (consumindo, para texto repetido). */
function idsNaOrdem(textos: string[], opcoes: Opcao[]): string[] {
	const livres = [...opcoes];
	return textos.flatMap((texto) => {
		const i = livres.findIndex((o) => o.text === texto);
		return i < 0 ? [] : [livres.splice(i, 1)[0].id];
	});
}

/** Troca dois vizinhos — fora de ordem num ponto só. */
function trocaVizinhos<T>(lista: T[]): T[] {
	if (lista.length < 2) return lista;
	const copia = [...lista];
	const i = Math.floor(acaso() * (copia.length - 1));
	[copia[i], copia[i + 1]] = [copia[i + 1], copia[i]];
	return copia;
}

/**
 * Monta a resposta de um aluno sobre o que ELE viu (`toRuntime` com a semente da
 * tentativa) e a corrige com o grader do item. Devolve a resposta e a nota que o
 * Player teria gravado.
 */
function responder(
	item: ItemPublicado,
	semente: string,
	alvo: Alvo,
	outrasFrases: string[]
): { resposta: unknown; nota: number } | null {
	const interaction = interactionSchema.parse(item.interaction);
	const grading = gradingSchema.parse(item.grading);
	if (grading.mode === 'rubric') return null;
	const locale = localeSchema.parse(item.locale);
	const registro = getInteraction(interaction.type);
	const payload = interaction.payload as Record<string, unknown>;
	const runtime = registro.toRuntime(interaction.payload, semente) as unknown as Record<
		string,
		unknown
	>;
	const perfil = getProfile(grading.answerLang === 'source' ? locale.source : locale.target);
	const corrigir = (resposta: unknown): number | null => {
		const r = registro.grade(interaction.payload, resposta, perfil, semente);
		return r.ok ? r.value.value : null;
	};
	const com = (resposta: unknown) => {
		const nota = corrigir(resposta);
		return nota === null ? null : { resposta, nota };
	};

	switch (interaction.type) {
		case 'type':
		case 'cloze': {
			const certa = (payload.accepted as string[])[0];
			if (alvo === 'certa') return com({ text: certa });
			if (alvo === 'quase') return com({ text: comDeslize(certa) });
			return com({ text: algum(outrasFrases.filter((f) => f !== certa)) ?? 'não sei' });
		}
		case 'choice': {
			const opcoes = runtime.options as Opcao[];
			const notas = opcoes.map((o) => ({ id: o.id, nota: corrigir({ optionId: o.id }) ?? 0 }));
			const escolha =
				alvo === 'certa'
					? notas.find((n) => n.nota >= 1)
					: (notas.find((n) => n.nota < 1) ?? notas[0]);
			return escolha ? com({ optionId: escolha.id }) : null;
		}
		case 'assemble': {
			const certa = idsNaOrdem((payload.accepted as string[][])[0], runtime.tokens as Opcao[]);
			if (alvo === 'certa') return com({ sequence: certa });
			if (alvo === 'quase') return com({ sequence: trocaVizinhos(certa) });
			return com({ sequence: [...certa].reverse().slice(0, Math.max(1, certa.length - 1)) });
		}
		case 'order': {
			const certa = idsNaOrdem(payload.lines as string[], runtime.lines as Opcao[]);
			if (alvo === 'certa') return com({ sequence: certa });
			if (alvo === 'quase') return com({ sequence: trocaVizinhos(certa) });
			return com({ sequence: [...certa].reverse() });
		}
		case 'match': {
			const pares = payload.pairs as { left: string; right: string }[];
			const esquerda = runtime.left as Opcao[];
			const direita = runtime.right as Opcao[];
			const certos = pares.flatMap((p) => {
				const l = esquerda.find((o) => o.text === p.left);
				const r = direita.find((o) => o.text === p.right);
				return l && r ? [{ left: l.id, right: r.id }] : [];
			});
			const direitas = certos.map((p) => p.right);
			const embaralhadas =
				alvo === 'certa'
					? direitas
					: alvo === 'quase'
						? trocaVizinhos(direitas)
						: [...direitas.slice(1), direitas[0]];
			return com({ pairs: certos.map((p, i) => ({ left: p.left, right: embaralhadas[i] })) });
		}
		default:
			return null;
	}
}

/** Todas as frases-alvo do seed — a resposta "errada" de quem digita é outra frase do conjunto. */
const FRASES = PLANOS.flatMap((p) =>
	p.materiais.flatMap((m) =>
		m.kind === 'SentencePair' ? [(m.data as { target: string }).target] : []
	)
);

let totalDeTentativas = 0;

/** Uma tentativa inteira (ou parada no meio), com as respostas corrigidas. */
async function tentar(opcoes: {
	atividade: Atividade;
	nome: string;
	studentId: string | null;
	inicio: Date;
	nivel: number;
	terminou: boolean;
}): Promise<void> {
	const { atividade, nome, studentId, inicio, nivel, terminou } = opcoes;
	if (!atividade.publicacao || atividade.itens.length === 0) return;
	const semente = crypto.randomUUID();
	const tentativa = await prisma.attempt.create({
		data: {
			name: nome,
			anonId: crypto.randomUUID(),
			seed: semente,
			publicationId: atividade.publicacao.id,
			studentId,
			startedAt: inicio
		}
	});
	const quantas = terminou
		? atividade.itens.length
		: Math.max(1, Math.floor(atividade.itens.length * entre(0.3, 0.7)));
	let relogio = inicio.getTime();
	for (const item of atividade.itens.slice(0, quantas)) {
		const sorteio = acaso();
		const alvo: Alvo = sorteio < nivel ? 'certa' : sorteio < nivel + 0.15 ? 'quase' : 'errada';
		const r = responder(item, `${semente}:${item.id}`, alvo, FRASES);
		if (!r) continue;
		const ms = Math.round(entre(3500, 28000));
		relogio += ms + 2500;
		await prisma.attemptItem.create({
			data: {
				attemptId: tentativa.id,
				itemId: item.id,
				answer: r.resposta as Prisma.InputJsonValue,
				score: r.nota,
				ms,
				createdAt: new Date(relogio)
			}
		});
	}
	if (terminou) {
		await prisma.attempt.update({
			where: { id: tentativa.id },
			data: { finishedAt: new Date(relogio + 20_000) }
		});
	}
	totalDeTentativas++;
}

/** Um instante entre `de` e agora — nunca no futuro, nunca antes de `de`. */
function depoisDe(de: Date, minimo: number, maximo: number): Date | null {
	const limite = agora.getTime() - 5 * MIN;
	const quando = de.getTime() + entre(minimo, maximo);
	if (quando < limite) return new Date(quando);
	return de.getTime() + minimo < limite ? new Date(entre(de.getTime() + minimo, limite)) : null;
}

// ── envios ─────────────────────────────────────────────────────────────────

let totalDeEnvios = 0;
const repoEnvios = envios(teacher);

/**
 * Um envio que JÁ SAIU: o envio e os convites pelo repositório (que não enfileira
 * nada), com a data puxada para trás, e as tentativas de quem abriu.
 */
async function enviar(opcoes: {
	atividade: Atividade;
	turma: { id: string; alunos: AlunoCriado[] };
	quando: Date;
	modulo?: { envioId: string; moduleId: string; porEmail: boolean };
	chance?: number;
}): Promise<number> {
	const { atividade, turma: alvo, quando, modulo, chance = 0.75 } = opcoes;
	if (!atividade.publicacao) return 0;
	const r = await repoEnvios.create(atividade.publicacao.id, alvo.id, modulo);
	if (!r?.delivery) return 0;
	const porEmail = modulo?.porEmail ?? true;
	await prisma.delivery.update({ where: { id: r.delivery.id }, data: { createdAt: quando } });
	for (const convite of r.invites) {
		const aluno = alvo.alunos.find((a) => a.id === convite.studentId);
		let aberto: Date | null = null;
		const sorteio = acaso();
		if (aluno && sorteio < chance) {
			const inicio = depoisDe(quando, 40 * MIN, 52 * HORA);
			if (inicio) {
				aberto = new Date(inicio.getTime() - MIN);
				await tentar({
					atividade,
					nome: aluno.nome,
					studentId: aluno.id,
					inicio,
					nivel: aluno.nivel,
					terminou: acaso() < 0.85
				});
			}
		} else if (sorteio < chance + 0.12) {
			aberto = depoisDe(quando, 30 * MIN, 30 * HORA);
		}
		await prisma.invite.update({
			where: { id: convite.id },
			data: {
				sentAt: porEmail ? new Date(quando.getTime() + MIN) : null,
				openedAt: aberto,
				createdAt: quando
			}
		});
	}
	totalDeEnvios++;
	return porEmail ? r.invites.length : 0;
}

// Envios diretos, fora de módulo — "Enviar atividade" da tela da turma.
await enviar({ atividade: ativ('viagem1'), turma: turma('9c'), quando: atras(9, 7) });
await enviar({ atividade: ativ('viagem2'), turma: turma('9c'), quando: atras(6, 7) });
await enviar({ atividade: ativ('espanhol1'), turma: turma('esp'), quando: atras(5, 14) });

// ── módulos e programação ──────────────────────────────────────────────────

/**
 * Uma turma alocada a um módulo, com a programação gravada e a agenda calculada
 * pela MESMA `agendar` do servidor, a partir de `inicio`. O que já passou sai
 * como saiu (enviada; "não saiu" quando a atividade era rascunho); o que vem
 * fica programado — sem job, ver o cabeçalho.
 */
async function programar(opcoes: {
	moduleId: string;
	ordem: Atividade[];
	turma: { id: string; alunos: AlunoCriado[] };
	programacao: Programacao;
	pausadaEm?: (datas: Date[]) => Date;
}): Promise<void> {
	const { moduleId, ordem, turma: alvo, programacao, pausadaEm } = opcoes;
	const alocacao = (await programacoes(teacher).doModulo(moduleId)).find(
		(a) => a.turma.id === alvo.id
	);
	if (!alocacao) throw new Error('Alocação não encontrada.');
	const grupos = agendar(
		programacao,
		ordem.map((a) => a.id),
		new Set(),
		programacao.inicio
	);
	const datas = grupos.map((g) => (g.data ? instanteDe(g.data, programacao.hora) : agora));
	const pausa = pausadaEm?.(datas) ?? null;
	await prisma.moduleClassroom.update({
		where: { id: alocacao.id },
		data: { schedule: programacao, pausedAt: pausa }
	});

	for (const [i, grupo] of grupos.entries()) {
		const quando = datas[i];
		const saiu = quando < agora && (!pausa || quando < pausa);
		const envioId = crypto.randomUUID();
		for (const item of grupo.itens) {
			const atividade = ordem.find((a) => a.id === item.id);
			if (!atividade) continue;
			if (!saiu) {
				await prisma.moduleSend.create({
					data: { allocationId: alocacao.id, activityId: item.id, dueAt: quando }
				});
				continue;
			}
			const noAr = atividade.publicacao && atividade.publicacao.desde < quando;
			if (!noAr) {
				await prisma.moduleSend.create({
					data: {
						allocationId: alocacao.id,
						activityId: item.id,
						dueAt: quando,
						status: 'nao_saiu',
						reason: 'rascunho'
					}
				});
				continue;
			}
			const emails = await enviar({
				atividade,
				turma: alvo,
				quando,
				modulo: { envioId, moduleId, porEmail: programacao.canal === 'email' },
				chance: programacao.canal === 'email' ? 0.75 : 0.45
			});
			await prisma.moduleSend.create({
				data: {
					allocationId: alocacao.id,
					activityId: item.id,
					dueAt: quando,
					status: 'enviada',
					sentAt: quando,
					emails,
					envioId
				}
			});
		}
	}
}

async function modulo(nome: string, cor: CorDeEtiqueta, descricao: string, ordem: Atividade[]) {
	const id = idDoSeed();
	await prisma.module.create({
		data: { id, name: nome, color: cor, description: descricao, teacherId: teacher.id }
	});
	await modulos(teacher).adicionar(
		id,
		ordem.map((a) => a.id)
	);
	return id;
}

const segundaPassada = somarDias(segundaDaSemana(hoje), -7);
const frutas = [ativ('frutas1'), ativ('frutas2'), ativ('frutas3'), ativ('frutas4')];
const moduloFrutas = await modulo(
	'Frutas',
	'teal',
	'Vocabulário de frutas, da feira à receita.',
	frutas
);
await programacoes(teacher).alocar(moduloFrutas, [turma('7b').id, turma('8a').id]);
// 7º B, por e-mail, segunda e quinta: a Frutas 3 era rascunho no dia dela e "não saiu".
await programar({
	moduleId: moduloFrutas,
	ordem: frutas,
	turma: turma('7b'),
	programacao: programacaoSchema.parse({ modo: 'semana', dias: [1, 4], inicio: segundaPassada })
});
// 8º A, só disponibilizar (no mapa, sem e-mail), toda quarta.
await programar({
	moduleId: moduloFrutas,
	ordem: frutas,
	turma: turma('8a'),
	programacao: programacaoSchema.parse({
		modo: 'semana',
		canal: 'mapa',
		dias: [3],
		inicio: segundaDaSemana(hoje)
	})
});

const rotina = [ativ('rotina1'), ativ('rotina2')];
const moduloRotina = await modulo('Rotina', 'violeta', 'Present simple e horários.', rotina);
await programacoes(teacher).alocar(moduloRotina, [turma('9c').id]);
// 9º C, por e-mail, toda terça às 7h30 — tudo pela frente.
await programar({
	moduleId: moduloRotina,
	ordem: rotina,
	turma: turma('9c'),
	programacao: programacaoSchema.parse({
		modo: 'semana',
		dias: [2],
		hora: '07:30',
		inicio: somarDias(hoje, 1)
	})
});

const viagem = [ativ('viagem1'), ativ('viagem2')];
const moduloViagem = await modulo('Viagem', 'azul', 'Aeroporto e hotel.', viagem);
await programacoes(teacher).alocar(moduloViagem, [turma('7b').id]);
// 7º B, toda sexta — PAUSADA depois do primeiro envio.
await programar({
	moduleId: moduloViagem,
	ordem: viagem,
	turma: turma('7b'),
	programacao: programacaoSchema.parse({ modo: 'semana', dias: [5], inicio: segundaPassada }),
	pausadaEm: (datas) =>
		new Date(Math.min(agora.getTime() - 2 * HORA, (datas[1] ?? agora).getTime() - DIA))
});

// Um módulo ainda sem turma: o estado "sem programação" da lista.
await modulo('Revisão do bimestre', 'ardosia', 'Uma de cada tema, para a semana de provas.', [
	ativ('frutas1'),
	ativ('rotina1'),
	ativ('viagem1')
]);

// ── o link aberto: quem respondeu sem convite ──────────────────────────────

const APELIDOS = ['Gabi', 'Rafa S.', 'luiza', 'Pedro H.', 'Ju', 'Tomás', 'Bia M.', 'Leo'];
for (const atividade of atividadesCriadas.values()) {
	if (!atividade.publicacao) continue;
	const quantas = 1 + Math.floor(acaso() * 3);
	for (let i = 0; i < quantas; i++) {
		// Uma delas nas últimas 48 horas: a semana do início nunca nasce vazia.
		const inicio =
			i === 0
				? depoisDe(new Date(agora.getTime() - 2 * DIA), 0, 2 * DIA)
				: depoisDe(atividade.publicacao.desde, HORA, 9 * DIA);
		if (!inicio) continue;
		await tentar({
			atividade,
			nome: algum(APELIDOS),
			studentId: null,
			inicio,
			nivel: entre(0.4, 0.9),
			terminou: acaso() < 0.8
		});
	}
}

console.log(
	`Pronto para ${email}: ${atividadesCriadas.size} atividades (1 rascunho), ${totalDeMateriais} materiais, ` +
		`${TURMAS.length} turmas com ${TURMAS.reduce((t, x) => t + x.alunos.length, 0)} alunos ` +
		`(${contas} com conta), 4 módulos, ${totalDeEnvios} envios e ${totalDeTentativas} tentativas.`
);
await prisma.$disconnect();
