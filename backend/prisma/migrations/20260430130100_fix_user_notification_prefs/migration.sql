-- ============================================================================
-- Migration: fix_user_notification_prefs
-- Adds notification preference columns to users
-- ============================================================================

ALTER TABLE "users" ADD COLUMN "notificationSound" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "users" ADD COLUMN "customSoundUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "soundEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "soundVolume" INTEGER NOT NULL DEFAULT 80;