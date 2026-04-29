-- ============================================================================
-- Migration: add_cmdb_assets_licenses
-- Phase 2: Asset, AssetAssignment, License, LicenseAssignment + enums
-- Ticket.affectedAssetId, User.assetsOwned + assetAssignments
-- ============================================================================

-- Create enums
CREATE TYPE "AssetCategory" AS ENUM (
  'COMPUTER', 'LAPTOP', 'PRINTER', 'PHONE', 'PERIPHERAL',
  'NETWORK_DEVICE', 'ELECTRICAL_TOOL', 'OTHER'
);

CREATE TYPE "AssetLifecycle" AS ENUM (
  'IN_STOCK', 'IN_USE', 'IN_MAINTENANCE', 'RETIRED', 'LOST'
);

CREATE TYPE "LicenseType" AS ENUM (
  'PERPETUAL', 'SUBSCRIPTION', 'OEM', 'VOLUME'
);

-- ============================================================================
-- Assets table
-- ============================================================================
CREATE TABLE "assets" (
  "id"          TEXT        NOT NULL DEFAULT uuid_generate_v4()::text,
  "tag"         TEXT        NOT NULL,
  "serialNumber" TEXT,
  "name"        TEXT        NOT NULL,
  "category"    "AssetCategory" NOT NULL,
  "status"      "AssetLifecycle" NOT NULL DEFAULT 'IN_USE',
  "sector"      "Sector"    NOT NULL,
  "location"    TEXT,
  "manufacturer" TEXT,
  "model"       TEXT,
  "purchaseDate" TIMESTAMP,
  "warrantyEndsAt" TIMESTAMP,
  "notes"       TEXT,
  "currentUserId" TEXT,
  "createdAt"   TIMESTAMP   NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP   NOT NULL DEFAULT now(),
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assets_tag_key" UNIQUE ("tag"),
  CONSTRAINT "assets_serialNumber_key" UNIQUE ("serialNumber")
);

CREATE INDEX "assets_sector_status_idx" ON "assets"("sector", "status");
CREATE INDEX "assets_category_idx" ON "assets"("category");
CREATE INDEX "assets_currentUserId_idx" ON "assets"("currentUserId");

ALTER TABLE "assets" ADD CONSTRAINT "assets_currentUserId_fkey"
  FOREIGN KEY ("currentUserId") REFERENCES "users"("id") ON DELETE SET NULL;

-- ============================================================================
-- AssetAssignments table (histórico de alocações)
-- ============================================================================
CREATE TABLE "asset_assignments" (
  "id"         TEXT    NOT NULL DEFAULT uuid_generate_v4()::text,
  "assetId"    TEXT    NOT NULL,
  "userId"     TEXT    NOT NULL,
  "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "returnedAt" TIMESTAMP,
  "reason"     TEXT,
  CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_assignments_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE,
  CONSTRAINT "asset_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "asset_assignments_assetId_returnedAt_idx" ON "asset_assignments"("assetId", "returnedAt");
CREATE INDEX "asset_assignments_userId_idx" ON "asset_assignments"("userId");

-- ============================================================================
-- Licenses table
-- ============================================================================
CREATE TABLE "licenses" (
  "id"          TEXT    NOT NULL DEFAULT uuid_generate_v4()::text,
  "software"   TEXT    NOT NULL,
  "vendor"     TEXT,
  "licenseKey"  TEXT,
  "type"        "LicenseType" NOT NULL,
  "seats"       INTEGER NOT NULL DEFAULT 1,
  "expiresAt"   TIMESTAMP,
  "cost"        DECIMAL(10, 2),
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "licenses_expiresAt_idx" ON "licenses"("expiresAt");

-- ============================================================================
-- LicenseAssignments table
-- ============================================================================
CREATE TABLE "license_assignments" (
  "id"         TEXT    NOT NULL DEFAULT uuid_generate_v4()::text,
  "licenseId"  TEXT    NOT NULL,
  "assetId"    TEXT,
  "userId"     TEXT,
  "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "license_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "license_assignments_licenseId_fkey"
    FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE,
  CONSTRAINT "license_assignments_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL
);

-- ============================================================================
-- Ticket: add affectedAssetId
-- ============================================================================
ALTER TABLE "ticket" ADD COLUMN "affectedAssetId" TEXT;
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_affectedAssetId_fkey"
  FOREIGN KEY ("affectedAssetId") REFERENCES "assets"("id") ON DELETE SET NULL;
CREATE INDEX "ticket_affectedAssetId_idx" ON "ticket"("affectedAssetId");