# Operação

Como subir, configurar e manter o entendo. Para o produto e as regras de código, ver `CLAUDE.md` e
`.claude/rules/`. Para as decisões, os ADRs desta pasta.

## O que roda

| Peça                | Onde                                 | Ciclo de vida                                    |
| ------------------- | ------------------------------------ | ------------------------------------------------ |
| Web (SvelteKit)     | `docker-compose.yml` → serviço `web` | Reconstrói à vontade — não guarda dado           |
| Worker (fila)       | `docker-compose.yml` → `worker`      | Junto do web; **atualize antes ou junto dele**   |
| PostgreSQL 16       | `docker/postgres.yml`                | Volume próprio, nunca recriado no deploy do app  |
| MinIO (dev) / R2    | `docker/minio.yml`                   | Volume próprio; regras de ciclo de vida (abaixo) |
| Áudio (Whisper+TTS) | `../audiotext-service`               | Compose próprio                                  |

Quatro composes de propósito: reconstruir a aplicação nunca encosta em dado do professor nem em
áudio publicado. Eles conversam pelas portas do host (`host.docker.internal`).

**O worker vem primeiro.** Tipo de job que ele não conhece lança erro e vai para `failed`. Os tipos de
hoje: `tts`, `convite`, `convite-modulo`, `convite-escola`, `aviso-equipe`, `envio-programado` e
`redefinir-senha` (o link de "esqueci a senha" — sem o worker novo, ele falha e ninguém recupera a senha).

## Desenvolvimento

```bash
docker compose -f docker/postgres.yml up -d
docker compose -f docker/minio.yml up -d      # opcional sem TTS
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev                                      # e, noutro terminal:
pnpm worker
```

Sem `EMAIL_PROVIDER`, todo e-mail (convites, avisos) sai no log do worker, com o link inteiro.
Sem `LLM_PROVIDER`, "Gerar com IA" fica travado com o motivo escrito.

### Dados de demonstração

```bash
pnpm db:seed:demo <email-do-professor>            # (re)cria o cenário nessa conta
pnpm db:seed:demo <email-do-professor> --limpar   # só apaga o que o seed criou
```

`scripts/seed-demo.ts` enche uma conta que JÁ EXISTE com um semestre de mentira: 10 atividades
(uma em rascunho), 66 materiais, 5 turmas com 50 alunos (alguns com conta e avatar), 4 módulos
(programado por e-mail, só no mapa, pausado e sem turma, mais um envio que "não saiu" por causa do
rascunho), os envios que já saíram e ~70 tentativas. As datas são relativas a hoje — rodar de novo
apaga o cenário anterior e o recria recente. Recusa `NODE_ENV=production`.

- **Só apaga o que criou**: as linhas de topo têm id começando por `seed` + seis letras do id do
  professor (um cuid começa sempre por "c"). O que o professor cadastrou à mão não é tocado.
- **Não manda nada**: os alunos têm e-mail em `exemplo.invalid` (domínio que não entrega), o
  histórico é gravado já enviado, e os envios FUTUROS dos módulos ficam programados sem job na fila
  — só disparam se a programação for salva de novo pela tela.
- **As questões e as notas são as do produto**: geradores e corte do wizard, sem escuta nem fala
  (não depende do serviço de áudio), e cada resposta de aluno é corrigida pelo grader de verdade.
- **Conta no trial**: o cenário passa dos limites do básico (10 atividades, 60 materiais) — criar
  fica bloqueado até ativar um plano pelo `/admin`.

## Produção

- **Migrations**: `pnpm db:deploy` (`prisma migrate deploy`) antes de subir a versão nova. Nunca
  `migrate dev` nem `db push` em produção. O Prisma 7 não gera o cliente sozinho: o `postinstall`
  roda `prisma generate`.
- **Ordem**: migration → worker → web.
- **Bucket**: duas regras de ciclo de vida precisam existir no R2 — `tts/` expira em **10 dias** e
  `fala/` em **7**. Em dev o container `init` de `docker/minio.yml` as escreve; no R2, crie-as à
  mão. Só `tts/` tem leitura pública.

## Variáveis de ambiente

As de infraestrutura (banco, storage, áudio, e-mail) estão comentadas no `.env.example`. As do
produto:

| Variável             | Para quê                                                                      |
| -------------------- | ----------------------------------------------------------------------------- |
| `BILLING_PROVIDER`   | Vazio/`manual`: "Assinar" vira pedido atendido no painel (adr-002)            |
| `PLATFORM_ADMIN_IDS` | IDs de `Teacher` com acesso ao `/admin` — IDs, nunca e-mails                  |
| `CONTATO_PARA`       | Caixa da equipe: pedidos de plano e formulário de contato                     |
| `LLM_PROVIDER`       | `gemini` liga "Gerar com IA"; vazio desliga (adr-003)                         |
| `GEMINI_API_KEY`     | Chave de projeto **com faturamento** (a política promete não treinar)         |
| `GEMINI_MODEL`       | Id do modelo — escolha o Flash estável vigente na página de modelos do Gemini |
| `WORKER_CONCURRENCY` | Jobs em paralelo (padrão 3). Acelera e-mail, não TTS                          |

## O primeiro admin

1. Crie a sua conta de professor pelo cadastro.
2. Pegue o id: `pnpm db:studio` (tabela `Teacher`) ou
   `SELECT id FROM "Teacher" WHERE email = 'voce@exemplo.com';`
3. Ponha em `PLATFORM_ADMIN_IDS` e reinicie o web. `/admin` responde 404 para todo o resto.

## Rotina da equipe (sem gateway de pagamento)

- **Pedido de plano**: chega um e-mail em `CONTATO_PARA` com o Reply-To do professor. Combine o
  pagamento, abra `/admin/pedidos` e clique em "Atender" (opcionalmente com a data de fim combinada).
- **Trial**: `/admin/professores/<id>` estende ou encerra. Os que vencem em 3 dias aparecem na visão
  geral.
- **Escola**: `/admin/escolas` → nova escola (assentos e limites por professor) → convide a
  coordenação. A coordenação convida os professores em `/escola`.
- **Jobs falhados**: aparecem na visão geral do painel, com o erro e "Tentar de novo".

## Antes de abrir para o público

- Verificar um domínio no Resend (sem isso ele só entrega para o e-mail da conta).
- Preços reais em `src/lib/content/planos.ts`.
- Dados reais da empresa em `src/lib/content/institucional.ts`.
