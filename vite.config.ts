import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

// `client.ts` lê `process.env.DATABASE_URL` (não `$env/dynamic/private`) porque
// o worker também importa esse módulo fora do runtime do SvelteKit — ver
// server.md "Prisma 7". Sem isto aqui, `pnpm dev` nunca carrega o `.env` nesse
// processo e o adapter do Postgres recebe a connection string vazia.
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true }
			},
			adapter: adapter(),
			// CLAUDE.md e as regras em .claude/rules usam `$lib` em todo lugar
			// ("$lib/server é bloqueado no cliente"). SvelteKit 3 troca o padrão
			// para `#lib`; mantemos o alias antigo para acompanhar a documentação.
			alias: { $lib: 'src/lib' },
			experimental: { remoteFunctions: true }
		})
	],
	test: {
		expect: { requireAssertions: true },
		// Testes de repositório usam o Prisma direto (process.env, não
		// $env/dynamic/private — ver client.ts) e precisam do `.env` carregado.
		setupFiles: ['dotenv/config'],
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
