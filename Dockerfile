# A aplicação — o processo web do SvelteKit e o worker da fila.
#
# São o MESMO artefato rodando comandos diferentes: o worker importa
# `src/lib/server` inteiro (TTS, storage, Prisma) e uma segunda imagem só para
# ele seria a mesma coisa com outro nome, saindo de sincronia na primeira vez
# que alguém esquecesse de reconstruir as duas.
#
# Banco, object storage e serviço de áudio NÃO estão aqui — cada um tem o
# próprio compose (`docker/postgres.yml`, `docker/minio.yml`,
# `../audiotext-service`). Ver o `docker-compose.yml` ao lado.

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /srv

# ------------------------------------------------------------------ build
FROM base AS build

# O schema entra ANTES do `install`: o `postinstall` roda `prisma generate`, e
# sem ele o cliente gerado (`/generated`) não existe para o `vite build`.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc prisma7.config.ts ./
COPY prisma ./prisma

# `prisma generate` não fala com o banco, mas `prisma7.config.ts` lê a variável.
# Uma string de mentira mantém o build sem rede e sem segredo — a de verdade
# chega em runtime, pelo compose.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ------------------------------------------------------------------ runtime
FROM base AS run
ENV NODE_ENV=production
# `adapter-node` escuta aqui; o compose é quem publica a porta para fora.
ENV PORT=3000

# Copiamos a árvore inteira do build, `node_modules` de desenvolvimento
# incluído, e isso é deliberado: o worker é executado por `tsx` (ele importa
# `.ts` com o alias `$lib`, que o Node não resolve sozinho) e precisa de
# `src/lib/server` em fonte. Podar para dependências de produção deixaria a
# imagem menor e o worker sem como subir.
COPY --from=build /srv /srv

USER node
EXPOSE 3000
CMD ["node", "build/index.js"]
