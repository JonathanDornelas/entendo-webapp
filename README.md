# entendo

SaaS onde professores de idiomas criam exercícios interativos e publicam por link. Ver
[CLAUDE.md](./CLAUDE.md) para produto, stack, estrutura e regras invioláveis.

## Primeira vez

```bash
cp .env.example .env    # preencha DATABASE_URL (Postgres 16, esquema postgresql://) e o resto
pnpm install
pnpm db:migrate
pnpm dev                # em outro terminal: pnpm worker
```

Comandos completos em [CLAUDE.md](./CLAUDE.md#comandos).
