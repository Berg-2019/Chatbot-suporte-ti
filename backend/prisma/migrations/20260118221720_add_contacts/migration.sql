-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "department" TEXT,
    "ramal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_jid_key" ON "contacts"("jid");

-- CreateIndex
CREATE INDEX "contacts_jid_idx" ON "contacts"("jid");

-- CreateIndex
CREATE INDEX "contacts_sector_idx" ON "contacts"("sector");
