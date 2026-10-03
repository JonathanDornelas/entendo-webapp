-- O avatar da conta, como dezoito números separados por hífen (ver
-- src/lib/avatar/montar.ts). Coluna de texto, não referência a arquivo: o
-- avatar não passa pelo bucket e não tem prazo de validade.
--
-- Nulo é o estado de fábrica e não precisa de backfill: quem nunca abriu o
-- editor aparece pelas iniciais, que é o que as telas já faziam antes disto.
ALTER TABLE "Teacher" ADD COLUMN "avatar" TEXT;
ALTER TABLE "StudentAccount" ADD COLUMN "avatar" TEXT;
