import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Quem administra a PLATAFORMA (o painel interno, `/admin`). Vem de
 * `PLATFORM_ADMIN_IDS`: ids de `Teacher`, separados por vírgula.
 *
 * **Ids, nunca e-mails.** O cadastro não verifica e-mail — se a lista fosse de
 * endereços, quem se cadastrasse primeiro com o e-mail do dono (antes de ele
 * criar a conta) viraria administrador. O id só existe depois de a conta certa
 * existir, e é quem opera que o copia para o `.env` (docs/operacao.md).
 */
export function ehAdminDaPlataforma(teacherId: string | null | undefined): boolean {
	if (!teacherId) return false;
	const ids = (env.PLATFORM_ADMIN_IDS ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);
	return ids.includes(teacherId);
}

declare const marcaAdmin: unique symbol;
/**
 * O escopo do admin. Só `requirePlatformAdmin` produz um — e o repositório que
 * lê ENTRE professores (`repos/admin.ts`) só aceita este tipo. Assim a leitura
 * sem escopo de professor não tem como ser chamada sem passar pelo guard.
 */
export type AdminScope = { readonly id: string; readonly [marcaAdmin]: true };

/**
 * A guarda do painel interno. Responde **404**, não 403: o painel não existe
 * para quem não o administra, e um 403 confirmaria que ele está ali. Toda
 * remote function de `/admin` começa por aqui — remote function não passa pelo
 * `hooks.server.ts` (a rota dela é `/_app/remote/...`).
 */
export function requirePlatformAdmin(locals: App.Locals): AdminScope {
	if (!locals.user || !ehAdminDaPlataforma(locals.user.id)) error(404, 'Not found');
	return { id: locals.user.id } as AdminScope;
}

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
