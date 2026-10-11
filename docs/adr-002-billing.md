# ADR-002 — Planos, limites e gestão de assinatura

**Estado:** aceito · outubro de 2026
**Substitui:** a seção "Trial provisório" de `.claude/rules/billing.md` e os planos de vitrine
(`livre` / `professor` / `escola`).

## Contexto

Os planos eram só vitrine (`src/lib/content/planos.ts`, preços inventados), `can()` decidia uma
coisa só ("publicar"), nenhum limite era aplicado e a cobrança estava em mock. Além disso, os campos
de cobrança do `Teacher` aceitavam valor vindo do corpo do cadastro e de `update-user`: qualquer
pessoa se dava `plan: "super"` com um POST.

O dono do repositório definiu:

| Plano     | Atividades                   | Materiais | Créditos de IA / mês | IA  |
| --------- | ---------------------------- | --------- | -------------------- | --- |
| `basico`  | 10                           | 60        | 0                    | não |
| `pro`     | 30                           | 300       | 300                  | sim |
| `super`   | 80                           | 1000      | 1000                 | sim |
| `scholar` | contrato da escola (ADR-005) |

## Decisões

### 1. Os limites são de ESTOQUE

Contam o que o professor **tem agora**, não o que criou no mês. Atividade arquivada não conta;
material reaproveitado (`findEquivalent`) não ocupa vaga nova. Créditos são a exceção: renovam por
ciclo mensal e não acumulam (ADR-003).

Consequência: é preciso um jeito de liberar vaga sem destruir resultado — daí **arquivar**
(`Activity.archivedAt`): sai do estoque, o link fecha para quem ainda não começou, quem já está
respondendo termina, e os resultados ficam. **Apagar de vez** existe também (com confirmação pelo
título), na ordem exigida pelos três FKs `RESTRICT` (tentativas → publicações → atividade).

Rebaixar de plano não apaga nada: quem está acima do limite só não cria até voltar para baixo dele.

### 2. Um catálogo, um ponto de decisão

- `src/lib/billing/catalogo.ts` — os limites, puros e isomórficos. A vitrine (`planos.ts`) escreve os
  números a partir dele; `catalogo.test.ts` garante que não divergem.
- `src/lib/server/billing/entitlements.ts` — puro: `montarEstado`, `can`, `cabe`,
  `motivoDoBloqueio`. **A situação sai das datas** (`trialEndsAt`, `currentPeriodEnd`,
  `gracePeriodEnd`), na leitura — sem cron que possa esquecer de rodar.
- `src/lib/server/billing/acesso.ts` — vai ao banco e monta o `EstadoDeAcesso` (linha, uso, créditos,
  escola). `resumoDoAcesso` é o DTO da tela, com as decisões já tomadas.

### 3. Cota com trava por professor

`comCota` (`src/lib/server/billing/cota.ts`) conta e cria na mesma transação, com
`SELECT … FOR NO KEY UPDATE` na linha do professor. `NO KEY` porque serializa quem disputa a cota sem
bloquear inserts que só referenciam o professor (sessão, mídia, respostas). Os repositórios aceitam o
`tx` (`db: Db`) — com o cliente global a escrita iria por outra conexão e travaria no próprio lock.

As cinco portas de material passam por `gravarMateriais`: o lote aceita até onde cabe e devolve
`foraDoLimite`, em vez de recusar tudo.

### 4. Sem gateway por enquanto — provedor manual

Decisão do dono: **não integrar Stripe agora**, mas deixar a estrutura pronta.

- `BillingProvider` devolve resultado **discriminado** (`redirecionar` | `pedido`), porque o
  provedor manual não tem para onde redirecionar.
- `manual-provider.ts`: "assinar" cria um `PlanRequest` e um aviso à equipe (job `aviso-equipe`);
  a equipe combina o pagamento e **atende pelo painel interno**, que ativa o plano.
- `assinaturas.ts` é o **único escritor** dos campos de cobrança, e cada operação grava um
  `AuditEvent` na mesma transação, com o ator (`admin:<id>`, `professor`, `sistema`, `provedor`).
- O webhook `routes/api/stripe` continua dormente. Quando um gateway entrar, ele implementa
  `BillingProvider` e o webhook chama `assinaturas.ts` — nenhuma tela muda.

**Por que não o plugin de Stripe do Better Auth agora:** ele traz tabela de assinatura e webhook
próprios, e o estado precisaria ser espelhado no `Teacher`; com a escola cobrada por contrato e um
possível gateway com Pix, a interface própria é o caminho de menor acoplamento. A decisão pode ser
revista quando o gateway for escolhido.

### 5. Trial

Cadastro novo nasce `trialing` com `trialEndsAt = agora + 14 dias` (`TRIAL.dias`), carimbado em
`databaseHooks.user.create.before` — nunca por `defaultValue` (com `input: false`, um default em
função é copiado sem ser chamado). As contas antigas ganharam 14 dias **a partir do deploy** na
própria migration, para ninguém que já publicava ser travado na hora.

### 6. Degradação, não desligamento

**Links publicados nunca saem do ar por cobrança.** Isso resolve o conflito antigo entre
`billing.md` ("até o fim da carência") e a vitrine ("nunca"): vale "nunca". O Player não consulta
`entitlements.ts`. O que pausa é criar e publicar.

### 7. Segurança

Todos os campos de cobrança e o `avatar` são `input: false` no Better Auth (o corpo com eles é
recusado com 400); `stripeCustomerId` é `returned: false`. Teste: `src/lib/server/auth/campos.test.ts`.

## Pendências

- Preços reais (os de `planos.ts` seguem placeholder).
- Escolha do gateway (Stripe ou um local com Pix) e o fluxo de confirmação pelo webhook.
- Ações de conta que não são cobrança (trocar senha, encerrar conta) continuam em mock.
