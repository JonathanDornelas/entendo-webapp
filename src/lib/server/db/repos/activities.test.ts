import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server/db/client';
import type { Item } from '$lib/kernel/item';
import { atividades } from './activities';

/** O plano de geração vem da etapa 1; aqui só precisa ser válido e estável. */
const PLANO = { itemTarget: 12, skills: ['listening', 'speaking', 'reading', 'writing'] };

// Regra inviolável nº 4 + testing.md "Obrigatório em repositório": todo
// repositório precisa provar que não devolve dado de outro professor.
describe('atividades', () => {
	let teacherA: Awaited<ReturnType<typeof prisma.teacher.create>>;
	let teacherB: Awaited<ReturnType<typeof prisma.teacher.create>>;

	beforeAll(async () => {
		teacherA = await prisma.teacher.create({
			data: {
				id: crypto.randomUUID(),
				name: 'Professora A',
				email: `a-${crypto.randomUUID()}@test.dev`
			}
		});
		teacherB = await prisma.teacher.create({
			data: {
				id: crypto.randomUUID(),
				name: 'Professor B',
				email: `b-${crypto.randomUUID()}@test.dev`
			}
		});
	});

	afterAll(async () => {
		const ids = [teacherA?.id, teacherB?.id].filter((id) => id !== undefined);
		if (ids.length === 0) return;
		// `Publication` não cai em cascata com o professor — apagar direto viola
		// `Publication_activityVersionId_fkey`. Some com elas primeiro.
		await prisma.publication.deleteMany({
			where: { activityVersion: { activity: { teacherId: { in: ids } } } }
		});
		await prisma.teacher.deleteMany({ where: { id: { in: ids } } });
	});

	it('não devolve atividade de outro professor', async () => {
		const activity = await atividades(teacherA).create('Atividade da A', 'pt-BR', 'en-US', PLANO);

		const fromOwner = await atividades(teacherA).byId(activity.id);
		const fromOther = await atividades(teacherB).byId(activity.id);

		expect(fromOwner?.id).toBe(activity.id);
		expect(fromOther).toBeNull();
	});

	/**
	 * O produto não tem versão na interface: para o professor a atividade é uma
	 * só, que ele publica e volta a editar. Estes dois testes cobrem o que
	 * sustenta isso por baixo — e os dois nasceram de bug real.
	 */
	describe('publicar, editar e publicar de novo', () => {
		function itemDeTeste(texto: string): Item {
			return {
				id: '',
				sourceContentId: null,
				generatedBy: null,
				prompt: { kind: 'text', text: texto, instructionKey: 'translate' },
				interaction: { type: 'type', payload: { accepted: [texto] } },
				grading: { mode: 'exact' },
				locale: { source: 'pt-BR', target: 'en-US' }
			};
		}

		it('devolve a atividade publicada como rascunho editável, sem tocar no que está no ar', async () => {
			const repo = atividades(teacherA);
			const activity = await repo.create('Para editar depois', 'pt-BR', 'en-US', PLANO);
			await repo.replaceDraftItems(activity.id, [itemDeTeste('livro'), itemDeTeste('mesa')]);
			await repo.publishDraft(activity.id, `editar-${crypto.randomUUID().slice(0, 8)}`, {});

			// Publicar congela a versão e o rascunho some: sem esta chamada a
			// tela de revisão abria VAZIA e a atividade sumia da frente dele.
			expect(await repo.draft(activity.id)).toBeNull();

			const editavel = await repo.draftFromPublished(activity.id);
			expect(editavel?.items).toHaveLength(2);

			const noAr = await repo.published(activity.id);
			expect(noAr?.items).toHaveLength(2);
			expect(noAr?.id).not.toBe(editavel?.id);

			// Idempotente: abrir a revisão duas vezes não gera dois rascunhos.
			const segunda = await repo.draftFromPublished(activity.id);
			expect(segunda?.id).toBe(editavel?.id);
		});

		it('republicar mantém o link e arquiva a publicação anterior', async () => {
			const repo = atividades(teacherA);
			const slug = `republicar-${crypto.randomUUID().slice(0, 8)}`;
			const activity = await repo.create('Para republicar', 'pt-BR', 'en-US', PLANO);
			await repo.replaceDraftItems(activity.id, [itemDeTeste('livro')]);
			const primeira = await repo.publishDraft(activity.id, slug, {});
			expect(primeira?.slug).toBe(slug);

			await repo.draftFromPublished(activity.id);
			await repo.replaceDraftItems(activity.id, [itemDeTeste('livro'), itemDeTeste('mesa')]);

			// `Publication.slug` é único: sem arquivar a anterior isto estourava
			// a constraint e o professor clicava em publicar sem nada acontecer.
			const segunda = await repo.publishDraft(activity.id, slug, {});
			expect(segunda?.slug).toBe(slug);
			expect(segunda?.id).not.toBe(primeira?.id);

			// A publicação antiga continua existindo — as tentativas em curso
			// apontam para ela — só perde o endereço público.
			const antiga = await prisma.publication.findUniqueOrThrow({ where: { id: primeira!.id } });
			expect(antiga.slug).toBe(`${slug}~1`);

			const noAr = await repo.published(activity.id);
			expect(noAr?.items).toHaveLength(2);
		});

		it('não rouba o link de outro professor', async () => {
			const slug = `disputado-${crypto.randomUUID().slice(0, 8)}`;
			const daA = await atividades(teacherA).create('Da A', 'pt-BR', 'en-US', PLANO);
			await atividades(teacherA).replaceDraftItems(daA.id, [itemDeTeste('livro')]);
			await atividades(teacherA).publishDraft(daA.id, slug, {});

			const daB = await atividades(teacherB).create('Do B', 'pt-BR', 'en-US', PLANO);
			await atividades(teacherB).replaceDraftItems(daB.id, [itemDeTeste('mesa')]);

			expect(await atividades(teacherB).publishDraft(daB.id, slug, {})).toBeNull();
			const aindaDaA = await prisma.publication.findUniqueOrThrow({ where: { slug } });
			expect(aindaDaA.activityVersionId).toBe((await atividades(teacherA).published(daA.id))?.id);
		});
	});
});
