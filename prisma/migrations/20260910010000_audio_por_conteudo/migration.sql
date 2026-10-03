-- O áudio deixa de ter dono além do professor.
--
-- O dono já foi o hash global, depois a atividade, depois o material. O material
-- parecia certo — é de onde o texto sai — mas ele é só um FACILITADOR de
-- montagem: apagar um da biblioteca derrubava o áudio de uma atividade no ar, e
-- nem uma referência solta conserta o mal-entendido de fundo, que é a atividade
-- depender de algo que o professor pode jogar fora.
--
-- A identidade passa a ser só o conteúdo: `hash(texto, voz, velocidade)`, único
-- por professor. Consequências boas: a mesma frase em dois materiais é UM
-- arquivo (antes eram dois), apagar material não alcança nada, e regerar
-- funciona sempre porque o texto está congelado no item.
--
-- As linhas existentes NÃO são migradas. A voz agora sai do TEXTO e não do id do
-- material, então os hashes antigos não bateriam de qualquer forma — e o áudio é
-- função pura do texto: recriar é uma volta na fila, não uma perda.
DELETE FROM "MediaAsset";

DROP INDEX "MediaAsset_contentUnitId_hash_key";
DROP INDEX "MediaAsset_contentUnitId_idx";
DROP INDEX "MediaAsset_teacherId_idx";
ALTER TABLE "MediaAsset" DROP COLUMN "contentUnitId";

CREATE UNIQUE INDEX "MediaAsset_teacherId_hash_key" ON "MediaAsset"("teacherId", "hash");
