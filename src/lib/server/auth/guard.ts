import { error } from '@sveltejs/kit';

/**
 * Toda remote function que toca dado de professor começa com isto — ver
 * .claude/rules/auth.md "Onde a guarda mora". Estar dentro de uma rota do
 * Studio não protege nada por si só (regra inviolável nº 3).
 */
export function requireTeacher(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (!locals.user) error(401);
	return locals.user;
}

/**
 * A guarda da área do ALUNO (`/aluno/**`). Outra identidade, outro cookie,
 * outra tabela — e por isso um guard próprio: `requireTeacher` aqui daria a um
 * aluno o acesso de professor, e o contrário faria o professor logado ver a
 * área do aluno como se fosse dele.
 *
 * A conta do aluno é OPCIONAL: nada no Player passa por aqui. Só as telas que
 * existem por causa da conta (o histórico dele, sair da conta).
 */
export function requireAluno(locals: App.Locals): NonNullable<App.Locals['aluno']> {
	if (!locals.aluno) error(401);
	return locals.aluno;
}
