import { describe, expect, it } from 'vitest';
import { vozDoTexto } from './voice';
import { getProfile } from './profiles';

/**
 * A voz varia entre frases e é a MESMA para a mesma frase — é isso que permite
 * o áudio ser identificado só pelo conteúdo (db.md "MediaAsset") e o hash ser
 * recalculado em qualquer lugar sem consultar nada.
 */
describe('vozDoTexto', () => {
	const enUS = getProfile('en-US');

	it('é determinística — a mesma frase sempre na mesma voz', () => {
		const primeira = vozDoTexto(enUS, 'She has been working here since 2019.');
		expect(vozDoTexto(enUS, 'She has been working here since 2019.')).toBe(primeira);
		expect(vozDoTexto(enUS, 'She has been working here since 2019.')).toBe(primeira);
	});

	// O ponto da mudança de dono: a mesma frase noutro material, ou noutra
	// atividade, é o MESMO arquivo — e para isso a voz não pode depender de onde
	// ela veio.
	it('não depende de onde a frase está guardada', () => {
		const daBiblioteca = vozDoTexto(enUS, 'Good morning.');
		const coladaDeNovo = vozDoTexto(enUS, 'Good morning.');
		expect(daBiblioteca).toBe(coladaDeNovo);
	});

	it('sempre devolve uma voz do catálogo do idioma', () => {
		for (const frase of ['Hi.', 'Are you still working on that project?', 'Good night.']) {
			expect(enUS.tts.voices).toContain(vozDoTexto(enUS, frase));
		}
	});

	// Uma atividade inteira na mesma voz treina o aluno a entender AQUELA
	// pessoa, não o idioma.
	it('frases diferentes caem em vozes diferentes', () => {
		const frases = Array.from({ length: 40 }, (_, i) => `Sentence number ${i}.`);
		const usadas = new Set(frases.map((f) => vozDoTexto(enUS, f)));
		expect(usadas.size).toBe(enUS.tts.voices.length);
	});

	// O modelo de TTS não fala árabe. Lista vazia é a resposta honesta, e é o
	// que faz o gerador não produzir item de escuta nesse idioma.
	it('idioma sem voz devolve null', () => {
		expect(vozDoTexto(getProfile('ar-SA'), 'مرحبا')).toBeNull();
	});
});
