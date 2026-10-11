-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "idiomaDosAlunos" TEXT NOT NULL DEFAULT 'pt-BR',
ADD COLUMN     "idiomas" TEXT[] DEFAULT ARRAY[]::TEXT[];
