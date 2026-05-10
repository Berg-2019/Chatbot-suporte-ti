-- ============================================================================
-- Migration: fix_user_status
-- Fixes schema drift: adds AgentStatus enum and status column to users
-- ============================================================================

-- Create AgentStatus enum
CREATE TYPE "AgentStatus" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY', 'AWAY');

-- Add status column to users
ALTER TABLE "users" ADD COLUMN "status" "AgentStatus" NOT NULL DEFAULT 'OFFLINE';
ALTER TABLE "users" ADD COLUMN "lastStatusChange" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN "lastSeenAt" TIMESTAMP;

-- Create indexes for the new columns
CREATE INDEX "users_status_idx" ON "users"("status");