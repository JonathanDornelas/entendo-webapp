# CLAUDE.md

## Produto

SaaS onde professores de idiomas criam exercícios interativos e publicam por link.
O aluno abre o link, digita o nome e responde — **sem criar conta**.

- **Professor**: tem conta e assinatura. Cria conteúdo, gera exercícios, publica, vê resultados.
- **Aluno**: anônimo. Responde e, se o professor permitir, vê o feedback ao terminar.

Os exercícios treinam as quatro habilidades — **listening, speaking, reading e writing** —
não apenas múltipla escolha. A referência de experiência é o Duolingo, não o Google Forms.

**O sistema é agnóstico de idioma.** Nenhuma regra de língua específica pode existir fora do
`LanguageProfile`. Se você está escrevendo `if (lang === 'ja')`, está errado.

## Stack

| Camada    | Escolha                                          |
| --------- | ------------------------------------------------ |
| Framework | SvelteKit (Svelte 5, runes) + `adapter-node`     |
| Server    | Remote functions (`.remote.ts`), sem API à parte |
| Estilo    | Tailwind 4 puro — sem framework de componentes   |
| ORM       | Prisma 7 (ESM, sem engine Rust, driver adapter)  |
| Banco     | PostgreSQL 16 — **fixo, decisão de infra**       |
| Schemas   | Zod                                              |
| Auth      | Better Auth (adapter Prisma)                     |
| Cobrança  | Stripe via plugin do Better Auth                 |
| Fila      | Tabela Postgres + `FOR UPDATE SKIP LOCKED`       |
| Mídia     | Object storage S3-compatível (preferir R2)       |
| Testes    | Vitest + Playwright                              |

Deploy exige processo Node de longa duração (worker + fila). Nada de edge-only.

## Estrutura

```
src/
  lib/
    kernel/       TS puro e isomórfico: interactions, grading, language, generators
    server/       só servidor: prisma, auth, billing, tts, asr, storage, queue
    components/
  routes/
    (studio)/     professor, autenticado
    a/[slug]/     player, aluno anônimo
    api/stripe/   webhook (precisa do body cru)
worker/           processo separado, consome a fila
prisma/
docs/             ADRs e decisões de produto
```

`$lib/server` é bloqueado no cliente pelo próprio SvelteKit. Não contorne isso.

## Regras invioláveis

Não são estilo. Violar qualquer uma é falha de segurança ou de corretude.

1. **Gabarito nunca vai para o browser em atividade avaliada.** Todo tipo de interação expõe
   `toRuntime()`, que produz o payload seguro. O payload de autoria fica no servidor.
2. **Correção acontece no servidor.** Sempre.
3. **Toda remote function é um endpoint HTTP público.** Cada uma começa pelo guard de sessão.
   Estar dentro de uma página protegida não protege nada.
4. **Toda query de dado de professor é escopada por `teacherId`.** Nunca use o `PrismaClient`
   cru numa remote function; use os repositórios de `$lib/server/db`.
5. **Nunca `split(' ')` para tokenizar.** Use `Intl.Segmenter` via `kernel/language`.
   Japonês, chinês e tailandês não separam palavras por espaço.
6. **Toda comparação de string passa pelo normalizador do kernel.** Normalização Unicode antes
   de qualquer igualdade, senão `é` composto não bate com `é` pré-composto.
7. **`ActivityVersion` publicada é imutável.** Editar cria versão nova.
8. **Aleatorização é determinística**, a partir da seed guardada na tentativa. F5 não muda nada.
9. **Nada de `any`.** Se o tipo é dinâmico, é um `ZodSchema`.

As regras 1, 4 e 5 têm teste obrigatório. Este arquivo explica o porquê; o build é quem garante.

## Comandos

```bash
pnpm dev            # dev server
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm worker         # worker da fila (rodar junto do dev)
pnpm db:migrate     # prisma migrate dev
pnpm db:studio
```

## Onde está o resto

As regras carregam sozinhas conforme os arquivos que você abrir:

- `.claude/rules/kernel.md` — tipos de exercício, registry, geradores, input do professor
- `.claude/rules/server.md` — remote functions, fila, TTS/ASR, mídia
- `.claude/rules/auth.md` — sessão, guards, multi-tenancy
- `.claude/rules/billing.md` — assinatura, webhook, entitlements
- `.claude/rules/db.md` — schema, JSON no Postgres, repositórios
- `.claude/rules/design-system.md` — UI, acessibilidade, peso do Player
- `.claude/rules/components.md` — snippets canônicos dos componentes reutilizáveis
- `.claude/rules/home.md` — voz e estrutura da página inicial
- `.claude/rules/paginas.md` — mapa de rotas do produto, o que é específico de cada uma
- `.claude/rules/testing.md` — o que é obrigatório testar

Procedimentos longos são skills: `nova-interacao`, `novo-idioma`.
Decisões e histórico ficam em `docs/`. Não replique aqui.

## Pendências

- TTS e ASR são o `audiotext-service` — o outro projeto do workspace (Whisper large-v3 +
  Kokoro-82M em Docker), ligado por `TTS_PROVIDER=audiotext` / `ASR_PROVIDER=audiotext`. A
  regra de omitir continua valendo e é o que sustenta rodar sem ele: sem TTS não há item de
  escuta, sem ASR não há item de fala. `TTS_PROVIDER=stub` ainda gera um WAV silencioso para
  exercitar a fila sem subir o serviço. Falta decidir o provedor de PRODUÇÃO (o de hoje é
  local, e a conta é de máquina, não por minuto).
- O áudio é identificado pelo **conteúdo** — `hash(texto, voz, velocidade)`, escopado por
  professor (`tts/<teacherId>/<hash>.mp3`). Material é FACILITADOR de montagem: apagar um não
  alcança atividade nenhuma. A voz também sai do texto (`kernel/language/voice.ts`).
- **Dois prazos, duas regras de ciclo de vida no bucket.** `tts/` são 10 dias (áudio de
  atividade, se regenera do texto); `fala/` são 7 (a gravação do aluno, que não se recria e só
  existe com autorização dele — auth.md). Em dev as duas vivem em `docker/minio.yml`; em
  produção o storage continua sendo o R2 preferido de server.md, e as duas precisam ser
  recriadas lá.
- **O alvo de produção é CPU, não GPU**: 4 vCPU, 16 GB, 200 GB NVMe. Por isso o Whisper roda
  `small` em `int8` com teto de 2 núcleos (`audiotext-service/app/config.py`) e todo container
  tem limite de CPU e memória no compose. Medido nessa configuração: TTS de uma frase em ~0,9 s,
  ASR de 3 s de áudio em ~1,4 s. Subir para `medium` ou `large-v3` é uma variável de ambiente —
  e uma máquina maior.
- O serviço de áudio tem **fila de admissão com teto** (`audiotext-service/app/fila.py`): passando
  do teto, 503 imediato em vez de aceitar trabalho que não vai entregar. É o que impede uma turma
  inteira apertando "Verificar" no mesmo segundo de virar trinta threads segurando áudio na
  memória. `/v1/info` expõe a profundidade das filas.
- **O TTS não fica mais rápido com paralelismo, e isso foi medido** (server.md "Fila"): o serviço
  é CPU-bound nos 2 vCPU dele. O que acelerava era o worker parar de dormir 2 s entre cada job —
  10 áudios passaram de 53,9 s para 35,4 s. Mais concorrência não move o número.
- As vozes de cada idioma saem da NOTA que o próprio Kokoro publica (kernel.md
  "LanguageProfile"), não do catálogo inteiro: só C+ para cima. **Mas o corte só está aplicado
  onde existe nota**: o VOICES.md do modelo não está no repositório, e nota por voz só foi
  verificada para inglês americano e japonês. `en-GB`, `fr-FR`, `it-IT`, `hi-IN` e `zh-CN` entram
  com o catálogo que o provedor aceita (o mesmo estado em que `es-ES` e `pt-BR` sempre
  estiveram), cada um com a pendência marcada no próprio profile. **Falta conferir as notas** e
  refazer os cortes — é uma edição de lista, não de código.
- **Os dez idiomas são os nove do Kokoro mais o árabe.** `audiotext-service/app/voices.py` é a
  fonte de quais o modelo fala, e `profiles.test.ts` falha se algum de lá ficar sem profile.
  **Japonês e chinês precisam de fonemizador próprio na IMAGEM do serviço de áudio** (`misaki[ja]`
  e `misaki[zh]`), e um deles COMPILA — havia um `EXTRAS=none` de padrão no Dockerfile que os
  deixava de fora, e o efeito era 500 em toda frase em japonês mais uma fila de 210 jobs
  falhados. O interruptor não existe mais: os dois vêm sempre. Se voltar a faltar, o sinal é
  cruzar `languages.tts` com `tts.languages_ready` no `/v1/info` — os dois estão em BCP-47 e
  qualquer diferença entre eles é um idioma que o serviço anuncia e não entrega.
  Inglês americano e britânico são DOIS profiles porque para o Kokoro são idiomas diferentes — a
  voz de um não sintetiza o outro. O árabe continua sem voz, e é o caso de controle dos testes:
  sem TTS a atividade sai completa e sem item de escuta.
- **Quatro composes, de propósito**: `docker-compose.yml` roda só a APLICAÇÃO (web + worker),
  `docker/postgres.yml` e `docker/minio.yml` rodam a infra, e o serviço de áudio tem o dele em
  `../audiotext-service`. Cada um com o próprio volume e o próprio ciclo de vida — reconstruir
  a aplicação não pode encostar em dado do professor nem no áudio publicado. Eles conversam
  pelas portas publicadas no host (`host.docker.internal`), não por uma rede compartilhada.
- **E-mail: Resend, plano grátis**, por SMTP (`EMAIL_PROVIDER=smtp` + `SMTP_URL` + `EMAIL_FROM`,
  server.md "E-mail"). Vazio é o estado de fábrica e só registra no log — foi o que fez o convite
  "não estar enviando" — e continua sendo o caminho de desenvolvimento, sem container nenhum.
  **Falta verificar um domínio no Resend** (o grátis inclui até 3): sem isso ele só entrega
  para o e-mail da própria conta, e o remetente é o compartilhado `onboarding@resend.dev`.
- Cobrança: Stripe primeiro, atrás de interface própria, porque recorrência com cartão no
  Brasil tem taxa de recusa alta. Ver `docs/adr-002-billing.md` (ainda não escrito).
- **Os preços da tela de planos são PLACEHOLDER.** `(site)/planos` existe e é o destino de quem
  bate num bloqueio (`?motivo=`), e a mesma tabela aparece na home — mas nome de plano, valor,
  ciclo e o que cada um libera NÃO foram decididos. Tudo mockado num arquivo só,
  `src/lib/content/planos.ts`, com o aviso no cabeçalho. `can()` não lê aquele arquivo: trocar um
  valor lá muda o que a tela MOSTRA, nunca o que a conta PODE fazer.
- **O avatar da conta são dezoito números, não uma imagem** (`src/lib/avatar/`) — coluna de texto
  em `Teacher` e `StudentAccount`, sem bucket e sem prazo de validade. Vale para professor e
  aluno, e é a única coisa da conta do aluno que ele escolhe por gosto (a regra de "nome, e-mail
  e senha, nada além disso" foi revisitada para isso — ver a nota em `auth/aluno.ts`).
- **Trial**: cadastro novo entra como `trialing` e já publica — decisão provisória para
  destravar o produto sem Stripe. Duração e exigência de cartão em aberto (billing.md).
- **Teclado virtual** em toda questão de escrever no idioma alvo, e só nela: grade para japonês
  (kana), mandarim (pinyin com tom), árabe e híndi, encaixada acima do rodapé do Player; barra de
  acentos para pt/es/fr/it; nada para inglês (`LanguageProfile.input`, kernel.md "Entrada"). O
  desenho é o protótipo "Player Teclado" do Claude Design — dos alfabetos dele só o japonês é do
  Kokoro. **Em japonês e mandarim o aluno escreve a LEITURA**, e ela é certa porque o servidor a
  põe no gabarito (`server/escrita`: kuromoji e pinyin-pro, 18 MB de dicionário, só no
  servidor) — e a recalcula na correção para o que foi publicado antes. Leitura automática pode
  errar em palavra de duas leituras; o professor a corrige no editor de item. Em aberto: tom
  omitido no pinyin (`wo` por `wǒ`) conta como erro, não como quase; lacuna que corta a palavra
  ao meio (`会` de `会い`) fica sem leitura; o kana não tem dígitos (resposta com `3` não vira
  questão de digitar); e a equivalência dos dígitos arábico-índicos no `ar-SA` continua por
  ligar.
- Geradores: os 7 de `SentencePair` mais um por tipo de conteúdo. Faltam 8 da tabela de
  kernel.md.
- **"Gerar com IA" no formulário de material é só front**: fonte (prompt / imagem / vídeo),
  quantidade e a lista de propostas estão desenhadas em `MaterialForm.svelte`, e o botão de
  gerar fica travado até existir um provedor de LLM (nenhum escolhido) atrás de interface
  própria em `$lib/server`. Imagem e vídeo pedem ainda leitura de arquivo, que não existe.
- Não existe mais fila de correção: comentar e dar nota de rubrica acontecem na tela da
  tentativa, em cima da resposta (paginas.md "Resultados").
- `conta` mostra dado real (nome, e-mail, estado da assinatura, o que `can()` libera), mas as
  AÇÕES dela — salvar, trocar senha, encerrar, checkout e portal — continuam em mock até o
  Stripe existir. `assinatura` virou uma aba dela (`conta?aba=assinatura`) e a rota só
  redireciona — ver paginas.md "O que falta".

## Todo:
- Sistema de dificuldade
- Documentação!
- Modulos para alocar atividades (ex: intermediario, frutas, etc..)
- Ambiente escolar!!, limites personalizados

basico - tudo menos IA, 10 atividades e 60 materiais
pro - 300 créditos, 30 atividades e 300 materiais
super - 1000 créditos, 80 e 1000
scholar - (ambiente diferente)