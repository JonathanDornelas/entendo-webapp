import { normalize } from './normalize';
import type { LanguageProfile } from './profile';
import { alcanceDoTeclado, type Teclado } from './teclado';

/**
 * O aluno CONSEGUE digitar esta resposta com o teclado virtual do idioma?
 *
 * A pergunta existe por causa do teclado de kana: ele escreve kana e não
 * escreve kanji, e as duas coisas aparecem misturadas na mesma frase. Pedir
 * para digitar `私は学生です` com um teclado que não tem `私` reprova o aluno com
 * a cara de estar funcionando — kana contra kanji vale zero, não parcial.
 *
 * **A comparação é depois do normalizador, dos dois lados.** O que a correção
 * descarta não precisa ser digitado (o `。` final, o espaço), e o que ela
 * funde conta como alcançado — no árabe a hamza sobre o alif some na correção,
 * então `أ` no gabarito é alcançável por quem só tem `ا`.
 *
 * Espaço é sempre alcançável: a barra de espaço é chrome do componente, não
 * tecla do layout.
 */
export function tecladoAlcanca(teclado: Teclado, texto: string, profile: LanguageProfile): boolean {
	const alcance = alcanceNormalizado(teclado, profile);
	return [...normalize(texto, profile)].every((c) => /\s/u.test(c) || alcance.has(c));
}

/** Os layouts são constantes de módulo: o alcance se calcula uma vez por par. */
const cache = new WeakMap<Teclado, Map<string, Set<string>>>();

function alcanceNormalizado(teclado: Teclado, profile: LanguageProfile): Set<string> {
	const porProfile = cache.get(teclado) ?? new Map<string, Set<string>>();
	cache.set(teclado, porProfile);
	const pronto = porProfile.get(profile.tag);
	if (pronto) return pronto;

	const alcance = new Set<string>();
	for (const c of alcanceDoTeclado(teclado)) {
		for (const n of normalize(c, profile)) alcance.add(n);
	}
	porProfile.set(profile.tag, alcance);
	return alcance;
}
