-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "sourceLang" TEXT NOT NULL DEFAULT 'pt-BR',
ADD COLUMN     "targetLang" TEXT NOT NULL DEFAULT 'en-US';
