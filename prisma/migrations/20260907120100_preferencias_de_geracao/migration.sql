-- O que a etapa 1 do wizard passou a perguntar: quantas questões gerar e quais
-- habilidades a atividade treina.
--
-- A habilidade de cada ITEM continua derivada (kernel.md) — isto é o filtro que
-- o professor aplica sobre o que os geradores produziram, não um campo
-- "habilidade" no exercício.
ALTER TABLE "Activity" ADD COLUMN "itemTarget" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "Activity" ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY['listening', 'speaking', 'reading', 'writing']::TEXT[];
