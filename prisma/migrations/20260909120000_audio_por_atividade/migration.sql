-- Um áudio pertence a UMA atividade, e morre em 10 dias.
--
-- Antes, o objeto era compartilhado entre atividades pelo hash de
-- (texto, voz, velocidade). Isso economizava síntese e não sobrevive à
-- expiração: uma atividade publicada no 9º dia herdaria um arquivo que morre no
-- 10º, e o áudio dela quebraria um dia depois de publicada.
--
-- As linhas existentes são DESCARTADAS em vez de migradas. Elas não têm a qual
-- atividade pertencem, e adivinhar seria pior do que regerar: o áudio é função
-- pura de (texto, voz, velocidade), então a próxima publicação o reconstrói. O
-- objeto no bucket some sozinho pela regra de ciclo de vida.
DELETE FROM "MediaAsset";

DROP INDEX IF EXISTS "MediaAsset_hash_key";

ALTER TABLE "MediaAsset" ADD COLUMN "activityId" TEXT NOT NULL;
ALTER TABLE "MediaAsset" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL;

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MediaAsset_activityId_hash_key" ON "MediaAsset"("activityId", "hash");
CREATE INDEX "MediaAsset_expiresAt_idx" ON "MediaAsset"("expiresAt");
