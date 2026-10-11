import { describe, expect, it } from 'vitest';
import { escaparHtml } from './base';
import { montarConviteAluno } from './convite-aluno';
import { montarAvisoEquipe } from './aviso-equipe';

describe('escaparHtml', () => {
	it('escapa os cinco caracteres que abrem marcação ou atributo', () => {
		expect(escaparHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
			'&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
		);
	});
});

describe('e-mails não injetam marcação vinda de pessoas', () => {
	const ataque = '<img src=x onerror=alert(1)>';

	it('convite do aluno', () => {
		const email = montarConviteAluno({
			studentName: ataque,
			teacherName: ataque,
			activityTitle: ataque,
			languageLabel: 'Inglês',
			itemCount: 10,
			minutes: 8,
			classroomName: ataque,
			link: 'https://exemplo.dev/e/abc',
			code: null,
			codeUrl: 'https://exemplo.dev/codigo'
		});
		expect(email.html).not.toContain('<img');
		expect(email.html).toContain('&lt;img');
		// O texto puro não tem marcação: lá o valor vai como foi digitado.
		expect(email.text).toContain(ataque);
	});

	it('aviso para a equipe', () => {
		const email = montarAvisoEquipe({ assunto: ataque, texto: `linha 1\n${ataque}` });
		expect(email.html).not.toContain('<img');
	});
});
