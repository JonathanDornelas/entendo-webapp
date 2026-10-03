import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../generated/prisma/client.ts';

// `process.env`, não `$env/dynamic/private` — este módulo também é importado
// pelo worker (processo Node separado, fora do Vite). Ver server.md
// "Prisma 7": instância única, o worker importa a mesma.
//
// O fallback para string vazia existe só para não quebrar a análise estática
// de rotas do SvelteKit, que importa este módulo sem carregar o `.env`; a
// pool do driver é preguiçosa e só tenta conectar na primeira query.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' });

export const prisma = new PrismaClient({ adapter });
