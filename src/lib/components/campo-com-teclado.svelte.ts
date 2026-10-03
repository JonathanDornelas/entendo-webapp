import { tick } from 'svelte';
import { apagar, inserir, trocarAnterior } from './teclado-edicao';

type Campo = HTMLInputElement | HTMLTextAreaElement;
export type Acao =
	| { tipo: 'inserir'; texto: string }
	| { tipo: 'apagar' }
	| { tipo: 'trocar'; mapa: Record<string, string> };

/**
 * Liga o teclado virtual a um campo de texto: sabe onde o cursor está e o
 * devolve para o lugar certo depois de cada tecla.
 *
 * **Por que guardar a seleção.** No toque e no mouse a tecla não rouba o foco
 * (ver `TecladoVirtual.svelte`), então o cursor do campo está sempre certo. Mas
 * quem usa TECLADO chega na tecla por Tab — o campo perde o foco, e com ele a
 * posição. O `lembrar()` no `blur` guarda onde o cursor estava; sem isso a letra
 * de quem navega por teclado cairia sempre no fim do texto.
 *
 * A edição em si é pura e testada em `teclado-edicao.ts`; aqui só mora o que
 * precisa do DOM.
 */
export class CampoComTeclado {
	elemento = $state<Campo | null>(null);
	#inicio = 0;
	#fim = 0;

	/** Guarda a posição do cursor. Chame no `blur` do campo. */
	lembrar = () => {
		const campo = this.elemento;
		if (!campo) return;
		this.#inicio = campo.selectionStart ?? campo.value.length;
		this.#fim = campo.selectionEnd ?? this.#inicio;
	};

	/**
	 * Aplica a tecla ao valor. `definir` é quem grava o valor novo — o campo usa
	 * `bind:value`, então a escrita tem de passar pelo estado do componente, e só
	 * DEPOIS de o Svelte redesenhar o cursor pode ser reposicionado (`tick`).
	 */
	aplicar = async (valor: string, acao: Acao, definir: (novo: string) => void, limite?: number) => {
		const campo = this.elemento;
		const focado = campo !== null && document.activeElement === campo;
		const inicio = focado ? (campo.selectionStart ?? valor.length) : this.#inicio;
		const fim = focado ? (campo.selectionEnd ?? valor.length) : this.#fim;

		const edicao =
			acao.tipo === 'inserir'
				? inserir(valor, inicio, fim, acao.texto, limite)
				: acao.tipo === 'trocar'
					? trocarAnterior(valor, inicio, fim, acao.mapa)
					: apagar(valor, inicio, fim);

		definir(edicao.valor);
		await tick();

		this.#inicio = edicao.cursor;
		this.#fim = edicao.cursor;
		// Reposiciona mesmo sem foco: quem navega por teclado continua na tecla
		// (e pode tocar várias em sequência), e a próxima letra tem de cair no
		// lugar certo quando ele voltar ao campo.
		campo?.setSelectionRange(edicao.cursor, edicao.cursor);
	};
}
