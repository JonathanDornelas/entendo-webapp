import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
mkdirSync('_meu', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
const erros = [];
page.on('pageerror', (e) => erros.push(`${page.url()}: ${e.message}`));

await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
await page.fill('input[name=email]', process.argv[2]);
await page.fill('input[name=password]', 'senha12345');
await page.click('button[type=submit]');
await page.waitForURL(/\/atividades/, { timeout: 15000 });

for (const url of process.argv.slice(3)) {
	const caminho = '/' + url.replace(/^\/+/, '');
	const nome = caminho.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'raiz';
	for (const [rot, w] of [['desktop', 1360], ['mobile', 420]]) {
		await page.setViewportSize({ width: w, height: 1000 });
		await page.goto(BASE + caminho, { waitUntil: 'networkidle' });
		await page.waitForTimeout(400);
		await page.screenshot({ path: `_meu/${nome}-${rot}.png`, fullPage: true });
	}
	console.log('ok', caminho);
}
await browser.close();
console.log('erros:', erros.length ? erros.join('\n') : 'nenhum');
