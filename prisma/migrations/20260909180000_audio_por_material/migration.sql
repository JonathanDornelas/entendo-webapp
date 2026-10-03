-- O áudio de TTS passa a pertencer ao MATERIAL, não à atividade.
--
-- Motivo: a mesma frase reusada em duas atividades sintetizava dois arquivos
-- idênticos e fazia o professor esperar a publicação duas vezes. O material é
-- de onde o texto sai, então é o dono natural.
--
-- As linhas existentes NÃO são migradas. Duas razões, e nenhuma delas é
-- preguiça: (1) não há como saber de qual material veio o áudio de uma
-- atividade — a ligação era só com a atividade, e uma atividade tem vários
-- materiais; (2) o áudio é função pura de (texto, voz, velocidade), então
-- recriar é uma volta na fila, não uma perda. A voz também mudou (agora varia
-- por material), logo os hashes antigos não bateriam de qualquer forma.
DELETE FROM "MediaAsset";

ALTER TABLE "MediaAsset" DROP CONSTRAINT "MediaAsset_activityId_fkey";
DROP INDEX "MediaAsset_activityId_hash_key";
ALTER TABLE "MediaAsset" DROP COLUMN "activityId";

ALTER TABLE "MediaAsset" ADD COLUMN "contentUnitId" TEXT NOT NULL;

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_contentUnitId_fkey"
  FOREIGN KEY ("contentUnitId") REFERENCES "ContentUnit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MediaAsset_contentUnitId_hash_key" ON "MediaAsset"("contentUnitId", "hash");
