-- AlterTable
ALTER TABLE "ContentUnit" ADD COLUMN     "targetLang" TEXT;

-- CreateIndex
CREATE INDEX "ContentUnit_teacherId_targetLang_idx" ON "ContentUnit"("teacherId", "targetLang");

-- Backfill: o material que já está em atividades ganha o idioma delas — o mais
-- frequente, se estiver em atividades de idiomas diferentes (empate: o da
-- atividade mais antiga). O que não está em nenhuma fica "sem idioma", e o
-- professor escolhe na biblioteca.
UPDATE "ContentUnit" cu
SET "targetLang" = escolhido.lang
FROM (
  SELECT DISTINCT ON (am."B") am."B" AS id, a."targetLang" AS lang
  FROM "_AtividadeMaterial" am
  JOIN "Activity" a ON a.id = am."A"
  GROUP BY am."B", a."targetLang"
  ORDER BY am."B", COUNT(*) DESC, MIN(a."createdAt") ASC
) escolhido
WHERE cu.id = escolhido.id;
