-- Retorno do professor sobre uma resposta. A fila de correção à parte deixou
-- de existir: comentar e corrigir acontecem na tela de resultados, em cima da
-- própria resposta.
--
-- `reviewedScore` é SEPARADO de `score` de propósito — guardar as duas
-- verdades (o que a correção automática achou e o que o professor decidiu) é o
-- que permite desfazer a correção manual sem ter de recorrigir.
ALTER TABLE "AttemptItem" ADD COLUMN "comment" TEXT;
ALTER TABLE "AttemptItem" ADD COLUMN "reviewedScore" DOUBLE PRECISION;
ALTER TABLE "AttemptItem" ADD COLUMN "reviewedAt" TIMESTAMP(3);
