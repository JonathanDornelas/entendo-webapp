import type { EmailParaEnviar } from './index';
import { COR, SANS, escaparHtml, moldura } from './base';

/**
 * O aviso para a EQUIPE: o formulário de contato e o pedido de plano. Vai para
 * `CONTATO_PARA`, nunca para um aluno, e por isso é simples — um assunto e um
 * texto. O texto é escapado linha a linha: ele carrega o que a pessoa digitou.
 */
export interface AvisoEquipe {
	assunto: string;
	texto: string;
}

export function montarAvisoEquipe(dados: AvisoEquipe): EmailParaEnviar {
	const linhas = dados.texto
		.split('\n')
		.map(
			(linha) =>
				`<p style="font-family:${SANS};font-size:14px;line-height:1.6;color:${COR.texto};margin:0 0 6px;white-space:pre-wrap;">${escaparHtml(linha) || '&nbsp;'}</p>`
		)
		.join('\n');

	const html = moldura({
		titulo: dados.assunto,
		preheader: dados.texto.slice(0, 120),
		etiqueta: 'Aviso para a equipe',
		corpo: `<tr><td style="padding:22px 26px 26px;">
  <p style="font-family:${SANS};font-size:16px;font-weight:700;color:${COR.texto};margin:0 0 14px;">${escaparHtml(dados.assunto)}</p>
  ${linhas}
</td></tr>`
	});

	return {
		to: '',
		subject: dados.assunto,
		preheader: dados.texto.slice(0, 120),
		html,
		text: dados.texto
	};
}
