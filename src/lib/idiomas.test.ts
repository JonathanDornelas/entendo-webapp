import { describe, expect, it } from 'vitest';
import {
	campoIdioma,
	casaComFiltro,
	codigoDoIdioma,
	IDIOMAS,
	idiomaMaisFrequente,
	idiomaOuNulo,
	idiomasPresentes,
	idiomasValidos,
	SEM_IDIOMA
} from './idiomas';
import { languageProfiles } from '$lib/kernel/language/profiles';

describe('tags de idioma', () => {
	it('todo idioma do produto tem tag, e toda tag tem LanguageProfile', () => {
		expect(IDIOMAS.length).toBeGreaterThanOrEqual(10);
		for (const i of IDIOMAS) expect(languageProfiles[i.tag]).toBeDefined();
	});

	it('o código é o subtag primário', () => {
		expect(codigoDoIdioma('en-US')).toBe('EN');
		expect(codigoDoIdioma('zh-CN')).toBe('ZH');
	});

	it('tag desconhecida conta como sem idioma, e o campo recusa', () => {
		expect(idiomaOuNulo('xx-YY')).toBeNull();
		expect(campoIdioma.safeParse('xx-YY').success).toBe(false);
		expect(campoIdioma.parse('')).toBeNull();
		expect(campoIdioma.parse('ja-JP')).toBe('ja-JP');
	});

	it('o filtro oferece só o que está na lista, na ordem do produto', () => {
		const r = idiomasPresentes(['ja-JP', 'en-US', null, 'ja-JP']);
		expect(r.idiomas.map((i) => i.tag)).toEqual(['en-US', 'ja-JP']);
		expect(r.temSemIdioma).toBe(true);
		expect(casaComFiltro(null, SEM_IDIOMA)).toBe(true);
		expect(casaComFiltro('en-US', SEM_IDIOMA)).toBe(false);
		expect(casaComFiltro('en-US', '')).toBe(true);
		expect(casaComFiltro('en-GB', 'en-US')).toBe(false);
	});

	it('o mais frequente vira o padrão', () => {
		expect(idiomaMaisFrequente(['es-ES', 'en-US', 'es-ES', null])).toBe('es-ES');
		expect(idiomaMaisFrequente([])).toBeNull();
	});

	it('a lista do perfil só guarda idiomas do produto, sem repetir, na ordem', () => {
		expect(idiomasValidos(['ja-JP', 'xx-YY', 'en-US', 'ja-JP', 7, null])).toEqual([
			'ja-JP',
			'en-US'
		]);
		expect(idiomasValidos(['en-US', 'es-ES', 'fr-FR'], 2)).toEqual(['en-US', 'es-ES']);
	});
});
