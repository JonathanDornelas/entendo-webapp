-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cycleAnchor" TIMESTAMP(3),
ADD COLUMN     "planCycle" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanRequest" (
    "id" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "ciclo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "PlanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_teacherId_createdAt_idx" ON "AuditEvent"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanRequest_teacherId_idx" ON "PlanRequest"("teacherId");

-- CreateIndex
CREATE INDEX "PlanRequest_status_createdAt_idx" ON "PlanRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRequest" ADD CONSTRAINT "PlanRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill (docs/adr-002-billing.md "Migração das contas que já existiam").
--
-- Toda conta de antes desta migration nasceu `trialing` SEM data de fim, e
-- `can()` a tratava como pagante. O trial dela passa a contar a partir DESTE
-- deploy, não de `createdAt`: contar do cadastro trancaria na hora quem já
-- publicava. Os 14 dias espelham `TRIAL.dias` em `$lib/billing/catalogo.ts`.
-- ---------------------------------------------------------------------------

UPDATE "Teacher" SET "subscriptionStatus" = 'trialing' WHERE "subscriptionStatus" IS NULL;

INSERT INTO "AuditEvent" ("id", "actor", "type", "data", "teacherId")
SELECT gen_random_uuid()::text, 'sistema', 'trial_migrado',
       jsonb_build_object('trialEndsAt', to_char(NOW() + INTERVAL '14 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
       "id"
FROM "Teacher"
WHERE "trialEndsAt" IS NULL AND "plan" IS NULL AND "subscriptionStatus" = 'trialing';

UPDATE "Teacher" SET "trialEndsAt" = NOW() + INTERVAL '14 days'
WHERE "trialEndsAt" IS NULL AND "plan" IS NULL AND "subscriptionStatus" = 'trialing';
