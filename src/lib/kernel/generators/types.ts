import type { LanguageProfile } from '../language/profile';
import type { Item } from '../item';

/**
 * `(ContentUnit, LanguageProfile) => Item[]`, função pura, sem I/O — ver
 * .claude/rules/kernel.md "Nível 2 — geradores". Conjunto de conteúdo pequeno
 * demais para gerar distratores? Retorne menos itens, nunca invente distrator.
 */

/** A unidade de conteúdo mais o id dela no banco, que vira `Item.sourceContentId`. */
export interface ContentRef<D> {
	id: string;
	data: D;
}

export interface GeneratorContext<D> {
	/** Idioma que o aluno está aprendendo. */
	targetProfile: LanguageProfile;
	/** Idioma do aluno — usado nos enunciados e nas traduções. */
	sourceProfile: LanguageProfile;
	/**
	 * As outras unidades do MESMO lote. É a única origem de distrator que o
	 * kernel aceita: nunca dicionário, nunca heurística de língua — é isso que
	 * mantém o gerador agnóstico de idioma (kernel.md "Distratores").
	 */
	siblings: ContentRef<D>[];
	/** Determinismo na escolha dos distratores — regra inviolável nº 8. */
	seed: string;
	/**
	 * O que o servidor consegue entregar hoje. O kernel é puro e não lê `env`
	 * — quem sabe se existe provedor é o servidor, e ele informa aqui. Sem
	 * ASR, nenhum item de fala é gerado; sem TTS, nenhum item de escuta
	 * (server.md: "Sem provedor de ASR configurado, o servidor omite o item").
	 */
	capabilities: { asr: boolean; tts: boolean };
}

export interface Generator<D> {
	id: string;
	generate: (content: ContentRef<D>, context: GeneratorContext<D>) => Item[];
}
