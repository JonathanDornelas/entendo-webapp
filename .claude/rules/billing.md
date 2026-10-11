---
paths:
  - 'src/lib/server/billing/**'
  - 'src/lib/billing/**'
  - 'src/routes/api/stripe/**'
  - 'src/routes/(studio)/conta/**'
  - 'src/routes/(site)/planos/**'
  - 'src/routes/(admin)/**'
---

# Planos, limites e assinatura

Decisões e histórico: `docs/adr-002-billing.md` (planos e cobrança) e `docs/adr-003-ia-gemini.md`
(créditos). Aqui, as regras que o código segue.

## Os planos

| Plano     | Atividades                                    | Materiais | Créditos de IA / mês |
| --------- | --------------------------------------------- | --------- | -------------------- |
| `basico`  | 10                                            | 60        | — (sem IA)           |
| `pro`     | 30                                            | 300       | 300                  |
| `super`   | 80                                            | 1000      | 1000                 |
| `scholar` | contrato da escola (`docs/adr-005-escola.md`) |

Os números moram em **`src/lib/billing/catalogo.ts`** e em nenhum outro lugar. A vitrine
(`src/lib/content/planos.ts`) escreve os textos a partir dele; `catalogo.test.ts` falha se divergirem.
Preço continua placeholder em `planos.ts` — trocar um valor ali muda o que a tela MOSTRA, nunca o que
a conta PODE fazer.

**Os limites são de ESTOQUE** — contam o que existe agora. Atividade arquivada não conta; material
reaproveitado (`findEquivalent`) não ocupa vaga nova. Créditos renovam por ciclo mensal e não
acumulam.

## Um ponto de decisão

Não espalhe `subscriptionStatus === 'active'` pelo código.

- `entitlements.ts` (puro): `montarEstado`, `can(estado, capacidade)`, `cabe(estado, recurso, n)`,
  `motivoDoBloqueio`. **A situação sai das DATAS** (`trialEndsAt`, `currentPeriodEnd`,
  `gracePeriodEnd`) na leitura — nada de cron.
- `acesso.ts`: `acessoDoProfessor(teacher, db?)` busca linha, uso, créditos e escola e monta o
  `EstadoDeAcesso`. `resumoDoAcesso` é o DTO da tela, com as decisões já tomadas por `can()`.
- O `motivoDoBloqueio` usa a lista fechada de `src/lib/billing/motivos.ts`, a mesma que
  `/planos?motivo=` aceita.

## Cota: contar e criar na mesma trava

Toda criação que ocupa estoque passa por **`comCota`** (`cota.ts`): transação com
`SELECT … FOR NO KEY UPDATE` na linha do professor, leitura do estado com o `tx`, e a escrita com o
`tx`. Por isso os repositórios aceitam `db: Db` — usar o `prisma` global dentro dela é escrever por
outra conexão e travar no próprio lock. Nada de chamada de rede dentro da trava.

Material entra sempre por **`gravarMateriais`** (`src/lib/server/atividades/gravar-materiais.ts`):
reaproveita o igual, aceita o lote até onde cabe e devolve `foraDoLimite`.

## Um escritor da cobrança

**`assinaturas.ts`** é o único lugar que escreve `plan`, `subscriptionStatus`, `currentPeriodEnd` &
cia. Cada operação grava um `AuditEvent` na mesma transação, com o ator. Painel e (futuro) webhook
chamam as mesmas funções.

No Better Auth esses campos são **`input: false`** (e `stripeCustomerId`, `returned: false`). Campo de
cobrança novo nasce assim — sem isso o corpo do cadastro escolhe o plano. Teste: `auth/campos.test.ts`.

## Sem gateway (por enquanto)

`BillingProvider` devolve resultado discriminado (`redirecionar` | `pedido`). O provedor em uso é o
**manual**: "assinar" vira `PlanRequest` + aviso à equipe, e o plano é ativado em `/admin/pedidos`.

Quando um gateway entrar, as três disciplinas continuam valendo:

1. **O webhook é a fonte da verdade, nunca o redirect.**
2. **O endpoint precisa do corpo cru** — `+server.ts` com `await request.text()`, não form action
   nem remote function.
3. **Idempotência** pelo `event.id` (`StripeEvent`): insira o evento e processe na mesma transação.

## Trial

Cadastro novo: `trialing` com `trialEndsAt = agora + TRIAL.dias`, carimbado em
`databaseHooks.user.create.before`. Nunca `defaultValue` em campo `input: false` (é copiado sem ser
chamado quando o corpo traz a chave). Trial usa os limites do básico.

## Degradação, não desligamento

Plano vencido **não apaga nada e não derruba link publicado** — nunca, não só "até a carência".
O que pausa é criar e publicar. O Player não consulta `entitlements.ts`. Aluno no meio de uma
tentativa nunca é afetado pela cobrança do professor.
