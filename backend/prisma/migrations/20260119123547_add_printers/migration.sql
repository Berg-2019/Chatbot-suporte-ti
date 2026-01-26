-- CreateTable
CREATE TABLE "printers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "community" TEXT NOT NULL DEFAULT 'public',
    "model" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "lastStatus" TEXT,
    "lastTonerBlack" INTEGER,
    "lastTonerCyan" INTEGER,
    "lastTonerMagenta" INTEGER,
    "lastTonerYellow" INTEGER,
    "lastPageCount" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "printers_ip_key" ON "printers"("ip");

-- CreateIndex
CREATE INDEX "printers_ip_idx" ON "printers"("ip");
