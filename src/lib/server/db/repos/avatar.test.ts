import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server/db/client';
import { contaProfessor } from './teachers';
import { gravarAvatarDoAluno, tentativasSoltas } from './student-accounts';
import { normalizar } from '$lib/avatar/montar';

/**
 * O avatar é escrita sobre a PRÓPRIA conta, e o escopo é o id da sessão. Estes
 * testes existem pela regra inviolável nº 4 (testing.md "Obrigatório em
 * repositório"): gravar o avatar de A não pode encostar na linha de B.
 *
 * É o cenário mais fácil de furar aqui porque o avatar é a primeira coisa do
 * produto que o usuário escreve sobre si mesmo — e a tentação seria aceitar um
 * id no corpo do pedido.
 */
describe('avatar da conta', () => {
	let professorA: Awaited<ReturnType<typeof prisma.teacher.create>>;
	let professorB: Awaited<ReturnType<typeof prisma.teacher.create>>;
	let alunoA: Awaited<ReturnType<typeof prisma.studentAccount.create>>;
	let alunoB: Awaited<ReturnType<typeof prisma.studentAccount.create>>;

	beforeAll(async () => {
		[professorA, professorB] = await Promise.all([
			prisma.teacher.create({
				data: {
					id: crypto.randomUUID(),
					name: 'Professora A',
					email: `av-a-${crypto.randomUUID()}@test.dev`
				}
			}),
			prisma.teacher.create({
				data: {
					id: crypto.randomUUID(),
					name: 'Professor B',
					email: `av-b-${crypto.randomUUID()}@test.dev`
				}
			})
		]);
		[alunoA, alunoB] = await Promise.all([
			prisma.studentAccount.create({
				data: {
					id: crypto.randomUUID(),
					name: 'Aluna A',
					email: `av-al-a-${crypto.randomUUID()}@test.dev`
				}
			}),
			prisma.studentAccount.create({
				data: {
					id: crypto.randomUUID(),
					name: 'Aluno B',
					email: `av-al-b-${crypto.randomUUID()}@test.dev`
				}
			})
		]);
	});

	afterAll(async () => {
		await prisma.teacher.deleteMany({ where: { id: { in: [professorA.id, professorB.id] } } });
		await prisma.studentAccount.deleteMany({ where: { id: { in: [alunoA.id, alunoB.id] } } });
	});

	it('nasce nulo — quem nunca abriu o editor aparece pelas iniciais', () => {
		expect({ professor: professorA.avatar, aluno: alunoA.avatar }).toEqual({
			professor: null,
			aluno: null
		});
	});

	it('grava o avatar do professor na linha dele, e só nela', async () => {
		const codigo = normalizar('3-5-2-1-4-2-3-1-2-1-7-4-3-2-1-6');
		await contaProfessor(professorA).gravarAvatar(codigo);

		const [a, b] = await Promise.all([
			prisma.teacher.findUnique({ where: { id: professorA.id }, select: { avatar: true } }),
			prisma.teacher.findUnique({ where: { id: professorB.id }, select: { avatar: true } })
		]);
		expect({ a: a?.avatar, b: b?.avatar }).toEqual({ a: codigo, b: null });
	});

	it('grava o avatar do aluno na conta dele, e só nela', async () => {
		const codigo = normalizar('0-11-6-3-2-5-0-2-1-1-9-3-4-8-5-7');
		await gravarAvatarDoAluno(alunoA.id, codigo);

		const [a, b] = await Promise.all([
			prisma.studentAccount.findUnique({ where: { id: alunoA.id }, select: { avatar: true } }),
			prisma.studentAccount.findUnique({ where: { id: alunoB.id }, select: { avatar: true } })
		]);
		expect({ a: a?.avatar, b: b?.avatar }).toEqual({ a: codigo, b: null });
	});

	it('trocar de avatar substitui, não acumula', async () => {
		const primeiro = normalizar('1-1-1-1-1-1-1-1-1-1-1-1-1-1-1-1');
		const segundo = normalizar('2-2-2-2-2-2-2-2-2-2-2-2-2-2-2-2');
		await gravarAvatarDoAluno(alunoB.id, primeiro);
		await gravarAvatarDoAluno(alunoB.id, segundo);

		const linha = await prisma.studentAccount.findUnique({
			where: { id: alunoB.id },
			select: { avatar: true }
		});
		expect(linha?.avatar).toBe(segundo);
	});

	// O convite de adotar aparece a partir desta contagem. Contar errado ofereceria
	// ao aluno respostas que não são dele — ou esconderia as que são.
	it('tentativas soltas não conta as de outro aparelho', async () => {
		const soltas = await tentativasSoltas(`anon-que-nao-existe-${crypto.randomUUID()}`);
		expect(soltas).toBe(0);
	});
});
