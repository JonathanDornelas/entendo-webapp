import type { PageServerLoad } from './$types';
import { requireTeacher } from '$lib/server/auth/guard';
import { modulos } from '$lib/server/db/repos/modules';
import { programacoes } from '$lib/server/db/repos/programacoes';
import { eventosDaAgenda } from '$lib/server/modulos/agenda';
import { hojeEmBrasilia } from '$lib/modulos/programacao';
import { rotuloDoInstante } from '$lib/modulos/estado';
import { etiquetaDaTurma } from '$lib/etiquetas';

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * O calendário de envios (desenho "Studio Calendario"): todos os módulos e
 * turmas num mês. É LEITURA — mudar uma data é na programação da turma, para
 * onde cada envio leva. Os eventos vêm inteiros (é a agenda do próprio
 * professor) e a tela filtra e troca de mês sem ir ao servidor.
 *
 * `?modulo=` abre só com aquele módulo ligado (o "Ver no calendário" do módulo
 * aberto) e `?mes=AAAA-MM` abre noutro mês; os dois são conferidos aqui — valor
 * que não é deste professor é ignorado, não erro.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const teacher = requireTeacher(locals);
	const repo = programacoes(teacher);
	const [eventos, pausadas, lista] = await Promise.all([
		eventosDaAgenda(teacher),
		repo.pausadas(),
		modulos(teacher).list()
	]);
	const hoje = hojeEmBrasilia();
	const pedido = url.searchParams.get('mes') ?? '';
	const moduloPedido = url.searchParams.get('modulo');

	// Só os módulos que têm algo para mostrar: envio no calendário ou programação pausada.
	const presentes = new Set([
		...eventos.map((e) => e.modulo.id),
		...pausadas.map((p) => p.modulo.id)
	]);
	const turmas = new Map(eventos.map((e) => [e.turma.id, e.turma.nome]));

	return {
		hoje,
		mes: MES.test(pedido) ? pedido : hoje.slice(0, 7),
		moduloInicial: moduloPedido && presentes.has(moduloPedido) ? moduloPedido : null,
		eventos,
		pausadas: pausadas.map((p) => ({
			alocacaoId: p.alocacaoId,
			moduloId: p.modulo.id,
			modulo: p.modulo.name,
			turma: p.turma.name,
			desde: rotuloDoInstante(p.desde).split(' ')[1]
		})),
		modulos: lista
			.filter((m) => presentes.has(m.id))
			.map((m) => ({ id: m.id, nome: m.name, cor: m.color, sigla: etiquetaDaTurma(m.name) })),
		turmas: [...turmas]
			.map(([id, nome]) => ({ id, nome }))
			.sort((a, b) => a.nome.localeCompare(b.nome))
	};
};
