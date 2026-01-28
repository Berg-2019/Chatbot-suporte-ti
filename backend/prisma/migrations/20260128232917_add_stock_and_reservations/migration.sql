-- CreateEnum
CREATE TYPE "StockType" AS ENUM ('TI', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('SUPPLY', 'INK', 'ASSET');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('UN', 'M', 'L', 'ML', 'CX', 'PCT', 'KG');

-- CreateEnum
CREATE TYPE "InkColor" AS ENUM ('BLACK', 'CYAN', 'MAGENTA', 'YELLOW');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_USE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_USE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "stockType" "StockType" NOT NULL DEFAULT 'TI',
    "category" "ItemCategory" NOT NULL DEFAULT 'SUPPLY',
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minQuantity" DECIMAL(10,2) NOT NULL DEFAULT 5,
    "unit" "UnitOfMeasure" NOT NULL DEFAULT 'UN',
    "unitCost" DECIMAL(10,2),
    "location" TEXT,
    "printerModel" TEXT,
    "inkColor" "InkColor",
    "assetTag" TEXT,
    "assetStatus" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userPhone" TEXT,
    "userSector" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "ticketId" TEXT,
    "notes" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_code_key" ON "stock_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_assetTag_key" ON "stock_items"("assetTag");

-- CreateIndex
CREATE INDEX "stock_items_stockType_idx" ON "stock_items"("stockType");

-- CreateIndex
CREATE INDEX "stock_items_category_idx" ON "stock_items"("category");

-- CreateIndex
CREATE INDEX "stock_items_assetStatus_idx" ON "stock_items"("assetStatus");

-- CreateIndex
CREATE INDEX "reservations_stockItemId_idx" ON "reservations"("stockItemId");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservations_startTime_idx" ON "reservations"("startTime");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
