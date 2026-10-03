-- CreateTable
CREATE TABLE "_AtividadeMaterial" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AtividadeMaterial_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AtividadeMaterial_B_index" ON "_AtividadeMaterial"("B");

-- AddForeignKey
ALTER TABLE "_AtividadeMaterial" ADD CONSTRAINT "_AtividadeMaterial_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AtividadeMaterial" ADD CONSTRAINT "_AtividadeMaterial_B_fkey" FOREIGN KEY ("B") REFERENCES "ContentUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
