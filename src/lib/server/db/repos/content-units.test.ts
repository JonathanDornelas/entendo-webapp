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
});
