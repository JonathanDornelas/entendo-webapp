-- O áudio deixa de morrer junto com o material.
--
-- Com a chave estrangeira em `Cascade`, apagar um material da biblioteca levava
-- junto o áudio de uma atividade NO AR. A partir daí o link devolvia 503, a
-- entrada do Player tentava repor, e o worker estourava em foreign key até o
-- job ir para `failed` — o link não voltava nunca mais. Isso contradizia o que a
-- tela promete antes de perguntar: "o que está no ar continua intacto".
--
-- A referência vira SOLTA, como `Item.sourceContentId` já é, e pela mesma razão:
-- a versão publicada é uma cópia congelada (regra inviolável nº 7) e nada da
-- biblioteca pode alcançá-la. Regerar continua funcionando mesmo sem o material,
-- porque o texto a sintetizar está no item, não nele.
ALTER TABLE "MediaAsset" DROP CONSTRAINT "MediaAsset_contentUnitId_fkey";

-- O índice que a chave estrangeira dava de graça agora é explícito: é por ele
-- que a limpeza de `materiais().remove()` acha o áudio de um material.
CREATE INDEX "MediaAsset_contentUnitId_idx" ON "MediaAsset"("contentUnitId");
