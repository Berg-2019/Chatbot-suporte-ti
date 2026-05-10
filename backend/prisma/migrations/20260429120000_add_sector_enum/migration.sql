-- ============================================================================
-- Migration: add_sector_enum
-- Converts sector from String to Sector enum (TI, ELECTRIC, COMPRAS)
-- ============================================================================

-- Create Sector enum type
CREATE TYPE "Sector" AS ENUM ('TI', 'ELECTRIC', 'COMPRAS');

-- ============================================================================
-- Users table
-- ============================================================================
ALTER TABLE "users" ALTER COLUMN sector DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN sector TYPE "Sector" USING sector::"Sector";
ALTER TABLE "users" ALTER COLUMN sector SET DEFAULT 'TI';

-- ============================================================================
-- Tickets table
-- ============================================================================
ALTER TABLE "tickets" ALTER COLUMN sector DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN sector TYPE "Sector" USING CASE WHEN sector IS NULL OR sector = '' THEN 'TI'::"Sector" ELSE sector::"Sector" END;
ALTER TABLE "tickets" ALTER COLUMN sector SET DEFAULT 'TI';

-- ============================================================================
-- Contacts table
-- ============================================================================
ALTER TABLE "contacts" ALTER COLUMN sector DROP DEFAULT;
ALTER TABLE "contacts" ALTER COLUMN sector TYPE "Sector" USING sector::"Sector";
ALTER TABLE "contacts" ALTER COLUMN sector SET DEFAULT 'TI';

-- ============================================================================
-- Purchases table
-- ============================================================================
ALTER TABLE "purchases" ALTER COLUMN sector DROP DEFAULT;
ALTER TABLE "purchases" ALTER COLUMN sector TYPE "Sector" USING sector::"Sector";
ALTER TABLE "purchases" ALTER COLUMN sector SET DEFAULT 'TI';

-- ============================================================================
-- Verify
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE column_name = 'sector';
