-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Activity_teacherId_archivedAt_idx" ON "Activity"("teacherId", "archivedAt");
