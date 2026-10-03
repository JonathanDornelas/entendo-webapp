-- Uma resposta por item POR TENTATIVA.
--
-- Sem esta restrição, voltar para uma questão e responder de novo criava uma
-- SEGUNDA linha, e o item passava a contar duas vezes na distribuição de
-- acerto do professor. Um clique duplo no "Verificar" fazia o mesmo.
--
-- A limpeza vem antes do índice porque o dado duplicado já existe: mantém a
-- resposta MAIS RECENTE de cada par (é a última que o aluno deu) e descarta as
-- anteriores. `ctid` é o desempate quando duas têm o mesmo `createdAt`.
DELETE FROM "AttemptItem" a
USING "AttemptItem" b
WHERE a."attemptId" = b."attemptId"
  AND a."itemId" = b."itemId"
  AND (a."createdAt", a.ctid) < (b."createdAt", b.ctid);

CREATE UNIQUE INDEX "AttemptItem_attemptId_itemId_key" ON "AttemptItem"("attemptId", "itemId");
