-- AlterTable: Add sector column to users table
ALTER TABLE "users" ADD COLUMN "sector" TEXT NOT NULL DEFAULT 'TI';
