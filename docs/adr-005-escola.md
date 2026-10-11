# ADR-005 — Ambiente escolar (plano Scholar)

**Estado:** aceito · outubro de 2026

## Contexto

O plano Scholar é "um ambiente diferente": uma escola com vários professores e uma coordenação, com
limites personalizados e cobrança por contrato.

## Decisões

### 1. Organização dentro do produto, com tabelas próprias

`School` (assentos, limites POR PROFESSOR, vigência, status), `SchoolMembership` (papel
`coordenacao` | `professor`, exceções de limite) e `SchoolInvite` (token de uso único, 7 dias).
Não usamos o plugin de organização do Better Auth: ele expõe endpoints que seria preciso trancar um a
um, e as regras daqui (assentos, exceções, só números para a coordenação) são de domínio.

Um professor está em **uma** escola por vez (`teacherId` único na filiação).

### 2. O contrato vale como plano

`escolaEmVigor` (`src/lib/server/db/repos/escola-vigente.ts`): escola `ativa` e contrato não vencido
→ plano `scholar`, com o limite de cada recurso sendo a **exceção do membro** (definida pelo admin)
ou o padrão da escola. Escola suspensa, encerrada ou vencida: o membro volta ao próprio plano — nada
é apagado, nenhum link sai do ar.

### 3. A coordenação vê só números

Decisão do dono: **nenhum nome de aluno, nenhuma resposta**. O repositório `escola(coordenacao)`
(`src/lib/server/db/repos/escola.ts`) só existe com um `CoordenacaoScope`, que só
`requireCoordenacao` produz (404 para quem não coordena). Por professor: uso contra o limite, turmas,
atividades no ar. Por turma: alunos (contagem), envios, tentativas terminadas, acerto médio.
Ex-membro sai da visão.

É a única leitura entre professores do produto além do painel interno (auth.md).

### 4. Quem define o quê

- **Painel interno** (`/admin/escolas`): cria a escola, ajusta contrato e status, define exceções por
  professor, convida a primeira pessoa da coordenação.
- **Coordenação** (`/escola`): convida e remove professores dentro dos assentos. Não edita limites.
- A última pessoa da coordenação não sai nem é removida.

### 5. Convite e aceite

O token (192 bits) é a prova de controle do e-mail — o cadastro não verifica e-mail, então casar
endereços não provaria nada. O aceite (`/escola/convite/<token>`) é um **botão**, nunca efeito de
abrir o link, e a tela diz o que muda antes. A transação trava a escola e depois o professor
(sempre nessa ordem): dois aceites não ocupam o mesmo último assento. Quem não tem conta passa pelo
cadastro e volta pelo `redirectTo` (o cadastro passou a respeitá-lo).

### 6. Conteúdo do professor

Continua do professor. Sair da escola não leva nada.

## Pendências

- Material compartilhado entre professores da escola.
- Faturamento da escola (hoje fora do sistema).
