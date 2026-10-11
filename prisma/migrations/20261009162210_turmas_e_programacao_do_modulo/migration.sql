-- CreateTable
CREATE TABLE "ModuleClassroom" (
    "id" TEXT NOT NULL,
    "schedule" JSONB,
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "moduleId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,

    CONSTRAINT "ModuleClassroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleSend" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'programada',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "emails" INTEGER,
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allocationId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,

    CONSTRAINT "ModuleSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleClassroom_classroomId_idx" ON "ModuleClassroom"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleClassroom_moduleId_classroomId_key" ON "ModuleClassroom"("moduleId", "classroomId");

-- CreateIndex
CREATE INDEX "ModuleSend_status_dueAt_idx" ON "ModuleSend"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSend_allocationId_activityId_key" ON "ModuleSend"("allocationId", "activityId");

-- AddForeignKey
ALTER TABLE "ModuleClassroom" ADD CONSTRAINT "ModuleClassroom_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleClassroom" ADD CONSTRAINT "ModuleClassroom_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSend" ADD CONSTRAINT "ModuleSend_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "ModuleClassroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSend" ADD CONSTRAINT "ModuleSend_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: a turma que já recebeu um módulo pelo envio de antes (o "manda
-- tudo") passa a estar ALOCADA a ele, com a programação "tudo agora" e o que
-- foi enviado marcado como enviado. Sem isto, o módulo sumiria da turma e do
-- mapa do aluno no dia do deploy, e reenviar mandaria tudo de novo.
INSERT INTO "ModuleClassroom" ("id", "schedule", "createdAt", "updatedAt", "moduleId", "classroomId")
SELECT gen_random_uuid()::text,
       jsonb_build_object('modo', 'agora', 'inicio', to_char(MIN(d."createdAt"), 'YYYY-MM-DD')),
       MIN(d."createdAt"), NOW(), d."moduleId", d."classroomId"
FROM "Delivery" d
WHERE d."moduleId" IS NOT NULL
GROUP BY d."moduleId", d."classroomId";

INSERT INTO "ModuleSend" ("id", "status", "dueAt", "sentAt", "envioId", "createdAt", "updatedAt", "allocationId", "activityId")
SELECT DISTINCT ON (mc."id", v."activityId")
       gen_random_uuid()::text, 'enviada', d."createdAt", d."createdAt", d."envioId",
       d."createdAt", NOW(), mc."id", v."activityId"
FROM "Delivery" d
JOIN "ModuleClassroom" mc ON mc."moduleId" = d."moduleId" AND mc."classroomId" = d."classroomId"
JOIN "Publication" p ON p."id" = d."publicationId"
JOIN "ActivityVersion" v ON v."id" = p."activityVersionId"
WHERE d."moduleId" IS NOT NULL
ORDER BY mc."id", v."activityId", d."createdAt" ASC;
