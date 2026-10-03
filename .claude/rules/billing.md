---
paths:
  - 'src/lib/server/billing/**'
  - 'src/routes/api/stripe/**'
  - 'src/routes/(studio)/assinatura/**'
---

# Assinatura

Plugin de Stripe do Better Auth: criação de cliente no cadastro, planos, troca de plano, trial,
cancelamento e portal de cobrança.

Mas a cobrança fica **atrás de uma interface própria** (`BillingProvider`), porque recorrência
com cartão de crédito no Brasil tem taxa de recusa alta e pode ser necessário trocar por um
gateway local com Pix. Nenhum código de produto importa o SDK do Stripe direto.

## As três disciplinas que decidem se a cobrança é confiável

**1. O webhook é a fonte da verdade, nunca o redirect.**
O aluno volta do Checkout para a página de sucesso? Isso não libera nada. O acesso só é
concedido quando o evento chega e é verificado. Redirect e webhook podem chegar fora de ordem.

**2. O endpoint do webhook precisa do corpo cru.**
Verificar a assinatura exige o body exato, antes de qualquer parse. Por isso o webhook é um
`+server.ts` com `await request.text()` — **não pode ser form action nem remote function.**

**3. Idempotência.**
O Stripe reenvia eventos. Guarde o `event.id` numa tabela e ignore repetidos, senão você libera
crédito duas vezes ou deixa o estado inconsistente.

## Entitlements

Não espalhe `subscription.status === 'active'` pelo código. Derive o estado de acesso na linha
do professor, atualizado pelo webhook:

```
Teacher { plan, subscriptionStatus, currentPeriodEnd, gracePeriodEnd }
```

E tenha um só ponto de decisão:

```ts
can(teacher, 'publicar_atividade');
can(teacher, 'usar_asr');
```

Quando a regra de negócio mudar — e vai mudar — você muda num lugar.

**Trial provisório**: professor recém-cadastrado nasce `subscriptionStatus: 'trialing'`
(`defaultValue` no Better Auth), e `can()` trata `trialing` como pagante. Sem isso ninguém
publica, porque o Stripe ainda não está plugado. **Duração do trial e exigência de cartão
continuam em aberto** — quando o checkout existir, quem escreve esse campo é o webhook, e esta
decisão precisa ser revisitada junto com o ADR de cobrança.

`can()` recebe só `{ subscriptionStatus, gracePeriodEnd }`, não a linha inteira do Prisma —
assim serve tanto para o banco quanto para o usuário da sessão do Better Auth, que traz os
mesmos campos com opcionalidade diferente.

## Degradação, não desligamento

Assinatura vencida **não apaga nada e não derruba link publicado**. Aluno no meio de uma
tentativa não pode ser afetado pela cobrança do professor.

O comportamento é: o professor perde a capacidade de criar e publicar, mas as atividades já
publicadas continuam respondendo até o fim do período de carência. Isso evita o pior cenário
possível do produto, que é o professor descobrir na frente da turma que o link morreu.
