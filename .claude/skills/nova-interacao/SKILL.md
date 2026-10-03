---
name: nova-interacao
description: Adicionar um novo tipo de interação de exercício ao kernel (choice, assemble, type, cloze, match, order, select, speak e afins). Use quando for criar uma forma nova de o aluno responder, registrar um tipo no registry de interações, ou quando alguém pedir "novo tipo de exercício". Cobre o schema de autoria, o toRuntime, o grader, o componente do Player, o gerador e os testes obrigatórios.
---

# Adicionar um tipo de interação

Sete passos, nesta ordem. Não pule para a UI antes de o grader estar testado.

## 1. Decidir se é mesmo um tipo novo

A maior parte dos "tipos novos" é combinação nova dos eixos existentes. Antes de escrever
código, confira: dá para expressar com um prompt diferente sobre uma interação que já existe?

"Ouça e escolha" não é tipo novo — é `audio` + `choice`. Nesse caso o trabalho é um **gerador**,
não uma interação. Pare aqui e vá para o passo 6.

Tipo novo é justificado só quando a **mecânica de resposta** é diferente de tudo que existe.

## 2. Schema de autoria

Em `src/lib/kernel/interactions/<id>.ts`. É o que o professor preenche e **contém o gabarito**.

Pense em como o formulário vai parecer, porque ele é gerado a partir daqui. Campo com nome ruim
vira label ruim. Prefira poucos campos com bons defaults a muitos campos opcionais.

## 3. Schema de resposta

O que o aluno envia. Mantenha mínimo e serializável. Nada de objeto aninhado profundo —
isso viaja em toda resposta de item.

## 4. `toRuntime`

**É a fronteira de segurança do produto.** Produz o payload que vai para o browser.

Regra: comece de um objeto vazio e adicione só o necessário. Nunca parta do payload de autoria
removendo campos — um campo novo adicionado depois vaza sem ninguém notar.

Embaralhamento usa a seed recebida, nunca `Math.random()`.

## 5. `grade`

Escolha o modo de correção mais barato que resolve. Retorne `Result<Score>` com score
entre 0 e 1 e o feedback estruturado — nunca lance exceção para resposta errada.

Aceite múltiplas respostas válidas. Passe toda comparação pelo normalizador do
`LanguageProfile`; nunca compare string direto.

## 6. Gerador

Em `src/lib/kernel/generators/`. `(ContentUnit, LanguageProfile) => Item[]`, pura.

Distratores saem **do próprio conjunto de conteúdo do professor**, nunca de dicionário ou
heurística de língua. Conjunto pequeno demais? Retorne menos itens. Nunca invente distrator.

## 7. Componente do Player

Em `src/lib/components/interactions/`. Recebe o payload de runtime e emite a resposta.

Funciona pelo teclado. Respeita `dir` do profile. Não contém regra de correção — nem para
feedback otimista.

## 8. Testes

Os quatro obrigatórios de `.claude/rules/testing.md`, sem exceção. O de `toRuntime` é o que
impede vazamento de gabarito; se você escrever só um, escreva esse.

## Checklist final

- [ ] Registrado no registry e aparece no Studio
- [ ] Formulário gerado a partir do schema, sem UI escrita à mão
- [ ] `toRuntime` testado contra vazamento
- [ ] Testado em idioma sem espaço e em idioma com diacrítico
- [ ] Habilidades derivadas corretamente (não declaradas manualmente)
- [ ] Nenhuma migration criada
