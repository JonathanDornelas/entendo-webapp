-- A gravação do aluno na questão de fala passa a poder ser GUARDADA, para o
-- professor ouvir e comentar.
--
-- Só com autorização explícita dele, pedida na entrada da atividade — daí o
-- `audioConsent` na tentativa, e não no aluno: ele autoriza esta atividade,
-- neste dia. `false` como padrão significa que toda tentativa que já existe
-- continua no comportamento antigo (transcreve e descarta).
ALTER TABLE "Attempt" ADD COLUMN "audioConsent" BOOLEAN NOT NULL DEFAULT false;

-- A CHAVE no bucket, não uma URL: o objeto é privado e quem serve é uma rota do
-- Studio que confere o dono. Prazo de 7 dias, contra os 10 do áudio de
-- atividade — aquele se regenera, este é a voz de uma pessoa.
ALTER TABLE "AttemptItem" ADD COLUMN "audioKey" TEXT;
ALTER TABLE "AttemptItem" ADD COLUMN "audioExpiresAt" TIMESTAMP(3);
