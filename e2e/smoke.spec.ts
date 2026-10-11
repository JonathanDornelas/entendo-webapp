import { expect, test } from '@playwright/test';

// Roda contra o `preview` (4173), e ali a autenticação fica presa ao `BETTER_AUTH_URL`
// do `.env` (auth.md): nenhum cenário logado funciona sem trocar essa variável, e ele
// gravaria no banco de dev. O bloqueio por limite de quem está logado é coberto no
// nível do repositório (`cota.test.ts`); aqui fica o que a superfície pública promete.

test('a home abre com a promessa do produto', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('quatro habilidades');
});

test('o painel interno responde 404 para quem não está logado', async ({ page }) => {
	const resposta = await page.goto('/admin');
	expect(resposta?.status()).toBe(404);
});

test('quem bate no limite chega aos planos sabendo por quê', async ({ page }) => {
	await page.goto('/planos?motivo=criar');
	await expect(page.getByText('Você chegou ao limite de atividades do seu plano')).toBeVisible();
});

test('motivo fora da lista fechada não vira texto na tela', async ({ page }) => {
	await page.goto('/planos?motivo=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
	await expect(page.locator('main')).not.toContainText('alert(1)');
	await expect(page.getByText('Você chegou ao limite')).toHaveCount(0);
});
