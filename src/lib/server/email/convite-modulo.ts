import type { EmailParaEnviar } from './index';
import { COR, DISPLAY, MONO, SANS, escaparHtml, moldura, primeiroNome } from './base';
import type { ConviteModuloJob } from '$lib/server/queue';

/**
 * O convite de MÓDULO: as atividades do módulo num e-mail só, cada uma com o
 * seu link pessoal (docs/adr-004-modulos-e-nivel.md).
 *
 * As regras do convite de uma atividade valem aqui também (server.md
 * "E-mail"): o link cru em TEXTO além do botão (cliente de e-mail engole
 * botão), o código de acesso como terceira alternativa, sem pixel de rastreio.
 * E tudo que veio de uma pessoa passa por `escaparHtml`.
 */
export function montarConviteModulo(dados: ConviteModuloJob): EmailParaEnviar {
	const nome = primeiroNome(dados.studentName);
	const professor = primeiroNome(dados.teacherName);
	const n = dados.atividades.length;
	const plural = n === 1 ? 'atividade' : 'atividades';
	const preheader = `${n} ${plural} do módulo ${dados.moduleName}, sem criar conta.`;

	const cartoes = dados.atividades
		.map((a, i) => {
			const codigo = a.code
				? `<p style="font-family:${SANS};font-size:12.5px;color:${COR.suave};margin:8px 0 0;">Ou em ${escaparHtml(a.codeUrl)}, código <span style="font-family:${MONO};font-weight:700;letter-spacing:0.2em;color:${COR.marca};">${escaparHtml(a.code)}</span></p>`
				: '';
			return `<tr><td style="padding:0 26px 14px;">
  <div style="border:1px solid ${COR.linha};border-radius:12px;padding:14px 16px;">
    <p style="font-family:${SANS};font-size:12px;font-weight:700;color:${COR.suave};margin:0 0 4px;">${i + 1} de ${n} · ${escaparHtml(a.languageLabel)} · ${a.itemCount} questões · ~${a.minutes} min</p>
    <p style="font-family:${SANS};font-size:16px;font-weight:700;color:${COR.texto};margin:0 0 10px;">${escaparHtml(a.title)}</p>
    <a href="${escaparHtml(a.link)}" style="display:inline-block;background:${COR.marca};color:${COR.branco};font-family:${SANS};font-size:14px;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:10px;">Começar</a>
    <p style="font-family:${MONO};font-size:12px;color:${COR.marca};margin:10px 0 0;word-break:break-all;">${escaparHtml(a.link)}</p>
    ${codigo}
  </div>
</td></tr>`;
		})
		.join('\n');

	const html = moldura({
		titulo: dados.moduleName,
		preheader,
		etiqueta: `Módulo · ${n} ${plural}`,
		corpo: `<tr><td style="padding:24px 26px 16px;">
  <p style="font-family:${DISPLAY};font-size:26px;font-weight:600;letter-spacing:-0.02em;color:${COR.texto};margin:0 0 12px;">Oi, ${escaparHtml(nome)}.</p>
  <p style="font-family:${SANS};font-size:15px;line-height:1.6;color:${COR.suave};margin:0 0 6px;">
    ${escaparHtml(professor)} mandou o módulo <strong style="color:${COR.texto};">${escaparHtml(dados.moduleName)}</strong> para a turma ${escaparHtml(dados.classroomName)}. Faça na ordem, pelo celular, sem instalar nada.
  </p>
</td></tr>
${cartoes}
<tr><td style="padding:6px 26px 24px;">
  <p style="font-family:${SANS};font-size:12.5px;line-height:1.6;color:${COR.suave};margin:0;">
    <strong style="color:${COR.texto};">Estes links são só seus.</strong> São eles que fazem o seu nome aparecer certo na lista de ${escaparHtml(professor)} — não repasse. Você recebeu este e-mail porque ${escaparHtml(dados.teacherName)} cadastrou seu nome na turma ${escaparHtml(dados.classroomName)}.
  </p>
</td></tr>`
	});

	const linhas: string[] = [
		`Oi, ${nome}.`,
		'',
		`${professor} mandou o módulo ${dados.moduleName} (${n} ${plural}). Faça na ordem:`,
		''
	];
	for (const [i, a] of dados.atividades.entries()) {
		linhas.push(`${i + 1}. ${a.title} — ${a.itemCount} questões, uns ${a.minutes} minutos`);
		linhas.push(`   ${a.link}`);
		if (a.code) linhas.push(`   Ou em ${a.codeUrl}, código ${a.code}`);
	}
	linhas.push(
		'',
		'Estes links são só seus — são eles que fazem o seu nome aparecer certo na lista.'
	);

	return {
		to: '',
		subject: `${dados.teacherName} mandou o módulo ${dados.moduleName} para você`,
		preheader,
		html,
		text: linhas.join('\n')
	};
}
