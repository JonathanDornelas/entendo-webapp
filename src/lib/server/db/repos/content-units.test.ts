import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server/db/client';
import { materiais } from './content-units';

// Regra inviolável nº 4 + testing.md "Obrigatório em repositório": todo
// repositório precisa provar que não devolve dado de outro professor.
describe('materiais', () => {
	let teacherA: Awaited<ReturnType<typeof prisma.teacher.create>>;
	let teacherB: Awaited<ReturnType<typeof prisma.teacher.create>>;

	beforeAll(async () => {
		teacherA = await prisma.teacher.create({
			data: {
				id: crypto.randomUUID(),
				name: 'Professora A',
				email: `a-${crypto.randomUUID()}@t.dev`
			}
		});
		teacherB = await prisma.teacher.create({
			data: {
				id: crypto.randomUUID(),
				name: 'Professor B',
				email: `b-${crypto.randomUUID()}@t.dev`
			}
		});
	});

	afterAll(async () => {
		const ids = [teacherA?.id, teacherB?.id].filter((id) => id !== undefined);
		if (ids.length > 0) await prisma.teacher.deleteMany({ where: { id: { in: ids } } });
	});

	it('não devolve material de outro professor', async () => {
		const unit = await materiais(teacherA).create('SentencePair', {
			source: 'Bom dia.',
			target: 'Good morning.'
		});

		expect((await materiais(teacherA).byIds([unit.id])).map((u) => u.id)).toEqual([unit.id]);
		expect(await materiais(teacherB).byIds([unit.id])).toEqual([]);
		expect((await materiais(teacherB).list()).map((u) => u.id)).not.toContain(unit.id);
	});

	it('não apaga material de outro professor', async () => {
		const unit = await materiais(teacherA).create('VocabItem', {
			term: 'bread',
			translation: 'pão'
		});

		expect(await materiais(teacherB).remove(unit.id)).toBe(false);
		expect(await materiais(teacherA).remove(unit.id)).toBe(true);
	});

	it('recusa material que não bate com o schema do kernel', async () => {
		await expect(
			materiais(teacherA).create('SentencePair', { source: 'só a origem' })
		).rejects.toThrow();
	});

	// A TAG DE IDIOMA (`$lib/idiomas.ts`): dentro de uma atividade é a dela; na
	// biblioteca, a escolhida. Reaproveitar dá tag a quem não tinha, e nunca
	// troca a de quem tinha.
	describe('tag de idioma', () => {
		const tagDe = async (id: string) =>
			(await prisma.contentUnit.findUniqueOrThrow({ where: { id } })).targetLang;

		it('material criado numa atividade fala o idioma dela', async () => {
			const atividade = await prisma.activity.create({
				data: { title: 'Japonês 1', teacherId: teacherA.id, targetLang: 'ja-JP' }
			});
			const { id } = await materiais(teacherA).createForActivity(atividade.id, 'VocabItem', {
				term: 'みず',
				translation: 'água'
			});
			expect(await tagDe(id)).toBe('ja-JP');
		});

		it('na biblioteca vale a escolhida; tag desconhecida vira sem idioma', async () => {
			const ok = await materiais(teacherA).create(
				'VocabItem',
				{ term: 'pan', translation: 'pão' },
				'es-ES'
			);
			expect(await tagDe(ok.id)).toBe('es-ES');
			const lixo = await materiais(teacherA).create(
				'VocabItem',
				{ term: 'zzz', translation: 'zzz' },
				'xx-YY'
			);
			expect(await tagDe(lixo.id)).toBeNull();
		});

		it('ligar a uma atividade dá tag a quem não tinha, e não troca a de quem tinha', async () => {
			const atividade = await prisma.activity.create({
				data: { title: 'Italiano 1', teacherId: teacherA.id, targetLang: 'it-IT' }
			});
			const sem = await materiais(teacherA).create('VocabItem', {
				term: 'acqua',
				translation: 'água'
			});
			const com = await materiais(teacherA).create(
				'VocabItem',
				{ term: 'agua', translation: 'água' },
				'es-ES'
			);
			await materiais(teacherA).link(atividade.id, sem.id);
			await materiais(teacherA).link(atividade.id, com.id);
			expect(await tagDe(sem.id)).toBe('it-IT');
			expect(await tagDe(com.id)).toBe('es-ES');
		});

		it('o idioma só muda enquanto o material não está em atividade nenhuma', async () => {
			const solto = await materiais(teacherA).create(
				'VocabItem',
				{ term: 'eau', translation: 'água' },
				'en-US'
			);
			await materiais(teacherA).update(
				solto.id,
				'VocabItem',
				{ term: 'eau', translation: 'água' },
				'fr-FR'
			);
			expect(await tagDe(solto.id)).toBe('fr-FR');

			const atividade = await prisma.activity.create({
				data: { title: 'Francês 1', teacherId: teacherA.id, targetLang: 'fr-FR' }
			});
			await materiais(teacherA).link(atividade.id, solto.id);
			await materiais(teacherA).update(
				solto.id,
				'VocabItem',
				{ term: 'eau', translation: 'água' },
				'es-ES'
			);
			expect(await tagDe(solto.id)).toBe('fr-FR');
		});

		it('outro professor não troca a tag', async () => {
			const meu = await materiais(teacherA).create(
				'VocabItem',
				{ term: 'sol', translation: 'sol' },
				'es-ES'
			);
			expect(
				await materiais(teacherB).update(
					meu.id,
					'VocabItem',
					{ term: 'sol', translation: 'sol' },
					'it-IT'
				)
			).toBe(false);
			expect(await tagDe(meu.id)).toBe('es-ES');
		});
	});
});
