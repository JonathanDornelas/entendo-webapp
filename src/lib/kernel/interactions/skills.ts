import type { Prompt, Skill } from './types';

/**
 * Metade da derivação de habilidade que depende só do prompt — kernel.md
 * "Habilidade é derivada, não declarada". A outra metade (speaking para
 * `speak`, writing para `type`/`cloze`) é fixa por interação e cada módulo
 * soma ao resultado disto. O professor nunca vê nem escolhe nada aqui.
 */
export function promptSkills(prompt: Prompt): Skill[] {
	const skills: Skill[] = [];
	if (prompt.kind === 'audio') skills.push('listening');
	if (prompt.kind === 'text') skills.push('reading');
	return skills;
}
