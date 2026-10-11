import { beforeEach, describe, expect, it, vi } from 'vitest';

// A fila é FALSA aqui: o teste prova o que vai para ela sem gravar um job que
// um worker com SMTP de verdade mandaria.
const enfileirados = vi.hoisted(() => [] as unknown[]);
vi.mock('$lib/server/queue', () => ({
	enqueueRedefinirSenha: async (job: unknown) => {
		enfileirados.push(job);
	}
}));

import { VALIDADE_DO_LINK_S, pedirRedefinicaoDeSenha } from './senha';

describe('pedir a redefinição de senha', () => {
	beforeEach(() => {
		enfileirados.length = 0;
	});

	it('enfileira o e-mail com o link, a conta e a validade de 1 hora', async () => {
		const antes = Date.now();
		await pedirRedefinicaoDeSenha(
			'aluno',
			{ email: 'lia@exemplo.invalid', name: 'Lia Tanaka' },
			'http://x/api/auth-aluno/reset-password/t0k?callbackURL=%2Fredefinir-senha%3Fcomo%3Daluno'
		);
		expect(enfileirados).toHaveLength(1);
		const job = enfileirados[0] as Record<string, string>;
		expect(job).toMatchObject({
			to: 'lia@exemplo.invalid',
			nome: 'Lia Tanaka',
			conta: 'aluno',
			link: 'http://x/api/auth-aluno/reset-password/t0k?callbackURL=%2Fredefinir-senha%3Fcomo%3Daluno'
		});
		const validade = new Date(job.expiraEm).getTime() - antes;
		expect(validade).toBeGreaterThanOrEqual(VALIDADE_DO_LINK_S * 1000 - 1000);
		expect(validade).toBeLessThanOrEqual(VALIDADE_DO_LINK_S * 1000 + 1000);
	});

	it('o link vale uma hora — o mesmo número que o e-mail promete', () => {
		expect(VALIDADE_DO_LINK_S).toBe(3600);
	});
});
