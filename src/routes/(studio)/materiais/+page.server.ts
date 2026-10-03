import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { prisma } from '$lib/server/db/client';
import { parseContentUnit } from '$lib/kernel/content/parse';
import type { ContentUnitKind } from '$lib/kernel/content/types';
import { labelForTag } from '$lib/kernel/language/profiles';
import { KERNEL_TO_KIND, type MaterialRow } from '$lib/components/material-form';

/**
 * A biblioteca. Diferente da etapa 2 do wizard, aqui o recorte é TUDO que o
 * professor cadastrou — inclusive o que ele colou dentro de uma atividade, que
 * é o caminho normal de o material entrar (db.md "ContentUnit.activities").
 *
 * O idioma não é campo do `ContentUnit`: ele vem das atividades que usam o
 * material. Material que ainda não está em nenhuma não tem idioma a mostrar, e
 * a tela diz isso em vez de inventar um.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const teacher = requireTeacher(locals);

	// Leitura direta do Prisma, mas SEMPRE escopada (db.md "Repositórios"): o
	// `teacherId` entra no `where` porque é ele que impede o vazamento.
	const rows = await prisma.contentUnit.findMany({
		where: { teacherId: teacher.id },
		orderBy: { createdAt: 'desc' },
		include: { activities: { select: { id: true, title: true, targetLang: true } } }
	});

	const materials: MaterialRow[] = rows.map((row) => {
		const kind = row.kind as ContentUnitKind;
		const data = parseContentUnit(kind, row.data);
		const [primary, secondary] =
			'target' in data
				? [data.target, data.source]
				: 'term' in data
					? [data.term, data.translation]
					: 'title' in data
						? [data.title, data.text.slice(0, 90)]
						: [data.lines[0]?.text ?? '', `${data.lines.length} falas`];

		const idiomas = [...new Set(row.activities.map((a) => labelForTag(a.targetLang)))];

		return {
			id: row.id,
			kind: KERNEL_TO_KIND[kind],
			primary,
			secondary,
			language: idiomas.join(', '),
			usedIn: row.activities.length,
			// Os campos crus, para "Editar" reabrir o mesmo formulário preenchido
			// — `secondary` é resumo (o texto vem cortado) e reeditar a partir
			// dele perderia conteúdo. São também o que a tela compara para dizer
			// "você já tem esta frase" enquanto o professor digita.
			target:
				'target' in data
					? data.target
					: 'term' in data
						? data.term
						: 'title' in data
							? data.title
							: '',
			source: 'source' in data ? data.source : 'translation' in data ? data.translation : '',
			raw: 'text' in data ? data.text : '',
			note: 'note' in data ? (data.note ?? '') : '',
			example: 'example' in data ? (data.example ?? '') : '',
			questions: 'questions' in data ? data.questions : [],
			lines: 'lines' in data ? data.lines : []
		};
	});

	return {
		materials,
		// Quantos estão em uso de verdade — "3 no total, 2 em atividades" é o
		// que o professor quer saber antes de apagar alguma coisa.
		usedInCount: materials.filter((m) => m.usedIn > 0).length,
		langFilters: [...new Set(materials.map((m) => m.language).filter(Boolean))] as string[]
	};
};
