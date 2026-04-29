-- ============================================================================
-- Migration: add_sector_enum
-- Converts sector from String to Sector enum (TI, ELECTRIC, COMPRAS)
-- ============================================================================

-- Create Sector enum type
CREATE TYPE "Sector" AS ENUM ('TI', 'ELECTRIC', 'COMPRAS');

-- ============================================================================
-- Users table
-- ============================================================================
ALTER TABLE "users" ALTER COLUMN sector SET DEFAULT 'TI';
ALTER TABLE "users" ALTER COLUMN sector TYPE "Sector" USING sector::"Sector";

-- ============================================================================
-- Tickets table
-- ============================================================================
ALTER TABLE "ticket" ALTER COLUMN sector TYPE "Sector" USING CASE WHEN sector IS NULL THEN 'TI' ELSE sector::"Sector" END;

-- ============================================================================
-- Contact table
-- ============================================================================
ALTER TABLE "contact" ALTER COLUMN sector TYPE "Sector" USING sector::"Sector";

-- ============================================================================
-- TeamMessage table
-- ============================================================================
ALTER TABLE "team_message" ALTER COLUMN sector SET DEFAULT 'TI';
ALTER TABLE "team_message" ALTER COLUMN sector TYPE "Sector" USING sector::"Sector";

-- ============================================================================
-- PurchaseRequest table
-- ============================================================================
ALTER TABLE "purchase_request" ALTER COLUMN sector TYPE "Sector" USING sector::"Sector";

-- ============================================================================
-- PurchaseRequestItem table
-- ============================================================================
ALTER TABLE "purchase_request_item" ALTER COLUMN sector TYPE "Sector" USING sector::"Sector";

-- ============================================================================
-- Verify
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE column_name = 'sector';
