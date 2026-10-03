import { expect, test } from '@playwright/test';

test('home page renders the wordmark', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'entendo' })).toBeVisible();
});
