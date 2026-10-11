-- CreateTable
CREATE TABLE "CreditEntry" (
    "id" TEXT NOT NULL,
    "cicloInicio" TIMESTAMP(3) NOT NULL,
    "delta" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "CreditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditEntry_refKey_key" ON "CreditEntry"("refKey");

-- CreateIndex
CREATE INDEX "CreditEntry_teacherId_cicloInicio_idx" ON "CreditEntry"("teacherId", "cicloInicio");

-- AddForeignKey
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
