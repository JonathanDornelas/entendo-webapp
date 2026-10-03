---
paths:
  - 'src/routes/+page.svelte'
  - 'src/routes/(marketing)/**'
  - 'src/lib/components/marketing/**'
---

# Página inicial (marketing)

A home é a única superfície pública com liberdade visual. Ainda assim, o tema é o mesmo:
violeta é a marca, ciano só para áudio, e **verde/âmbar/vermelho aparecem apenas na seção de
correção** — nunca como destaque decorativo.

Referência visual navegável: `docs/home.html`.
Regras base: `.claude/rules/design-system.md`. Snippets: `.claude/rules/components.md`.

## Voz

Fale com o professor, não sobre o produto. Frase curta, verbo concreto, zero jargão de
marketing. O argumento é sempre o trabalho dele: montar a atividade da próxima aula, ver o que a
turma errou, não precisar pedir para o aluno criar conta.

Não invente número: sem "10.000 professores", sem depoimento fabricado, sem preço que não
exista. Se não há dado real, o espaço fica sem dado.

## Estrutura

Sete blocos, nesta ordem. Cada um responde a uma pergunta e nenhum repete o anterior.

| #   | Bloco                   | O que resolve                                                  |
| --- | ----------------------- | -------------------------------------------------------------- |
| 1   | Hero + Player ao vivo   | O que é, e como se parece na mão do aluno                      |
| 2   | Quatro habilidades      | Por que não é só múltipla escolha                              |
| 3   | O Player (faixa escura) | Funciona no celular fraco, no 4G, com teclado e leitor de tela |
| 4   | Correção                | Existe o quase; parcial é um estado próprio                    |
| 5   | Do rascunho ao link     | Três passos, incluindo versão publicada imutável               |
| 6   | Qualquer idioma         | RTL, CJK, normalização de acento                               |
| 7   | CTA + rodapé            | "Você precisa de uma conta. Seus alunos, não."                 |

O hero mostra um **celular real que cicla entre as interações** (listening → escrita tolerante →
montar frase → fala) a cada 4,6s. Pastilhas abaixo indicam a tela ativa e permitem escolher; ao
escolher, o ciclo para. Esse é o argumento mais forte da página — não substitua por captura
estática.

## Reaproveitamento

O hero usa componentes reais do catálogo, não uma maquete: `AudioPlayer` (estado `listening`,
`playing` inicial `true` só para a onda animar sem precisar clicar — mesmo truque de
`/dev/components`, nunca inicialize assim numa tela real do Player) e `Recorder` (estado
`speak`). `Button` é polimórfico (`href` → `<a>`) e cobre todo CTA da página. `Logo` está no
cabeçalho e no rodapé — nunca duplique o SVG do ícone inline de novo. A action `use:reveal` é a
mesma de `src/lib/actions/reveal.ts` — não duplique.

O que fica só nesta página, sem virar componente novo: os cartões de habilidade, os passos
"rascunho ao link", os cartões de estado de correção em layout horizontal (ícone à esquerda,
texto empilhado à direita — diferente do `CorrectionState` vertical do Player) e o carrossel de
idiomas. São composições específicas de marketing; forçar isso num componente do Player os
tornaria mais complicados dos dois lados sem ganho real.

## Toggle de tema

O cabeçalho tem um botão de tema (ícone só, ao lado de "Entrar no Studio") — diferente do resto
do site, que segue `prefers-color-scheme` sem controle manual, a home é a superfície pública que
o professor decide visitar de dia ou de noite, então oferece a escolha. Estado inicial lê
`localStorage['entendo-theme']`; sem valor salvo, cai para a preferência do sistema — nunca força
claro por padrão (isso já foi bug no catálogo de dev: abrir com preferência escura do sistema e
ver a tela clara até clicar). Ao trocar, grava a escolha; visitas seguintes respeitam o que a
pessoa escolheu da última vez.

## Movimento

Todas as durações e curvas vêm de `design-system.md`. Específico da home:

- **Entrada em scroll**: cada bloco sobe por baixo ao entrar na viewport, via `use:reveal`. O
  bloco da seção entra sem delay; cartões dentro de uma grade escalonam 90ms
  (`use:reveal={{ delay: i * 90 }}`). O hero anima no carregamento, sem observer.
- **Formas de ambiente**: confinadas à coluna do celular no hero e a regiões sem texto nas
  faixas escura e violeta. Nunca atrás de parágrafo. Cada zona tem sua própria composição — não
  é o mesmo `AmbientShapes.svelte` genérico do catálogo reaproveitado três vezes, porque a
  contagem e o arranjo de formas mudam por zona (home.md pede isso, o componente genérico é de
  5 formas fixas para um bloco de tamanho fixo).
- **Carrossel de idiomas**: `en-marquee` linear infinito, lista duplicada, borda resolvida com
  `mask-image` em fade horizontal. `aria-hidden` — é ilustração, não conteúdo.
- **Hover**: cartão sobe 5px com a borda virando `primary`; linha de estado de correção desliza
  4px na horizontal. Botão usa `motion-tap`.

## Superfícies escuras

A faixa "O Player" e o CTA final usam superfície própria, **não** `base-content` como fundo — no
tema escuro isso vira texto claro sobre fundo claro. Os tokens são `panel`, `panel-content`,
`panel-dim`, `panel-line`, definidos nos dois temas em `app.css` (mesmo mecanismo de `line` e
`card` — ver design-system.md). A mesma regra vale para o bezel do celular (`bezel`) e para a
cor da sombra (`--shadow`, triplet RGB cru para `shadow-[...rgb(var(--shadow)/alpha)]`), que é
preta no escuro e violeta-tinta no claro.

## Acessibilidade

Vale tudo de `design-system.md`, mais:

- O celular do hero é **demonstração**: `aria-hidden` nas ondas de áudio e nas formas; as
  pastilhas são botões reais com `aria-pressed`.
- O carrossel de idiomas não é lido por leitor de tela; se a informação importar, repita em
  texto no parágrafo acima dele.
- Contraste de 4.5:1 em todo corpo de texto, incluindo o texto sobre as faixas escura e violeta.
