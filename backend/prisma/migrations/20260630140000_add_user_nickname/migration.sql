-- ============================================================================
-- Migration: add_user_nickname
-- Apelido exibido no chat do ticket em vez do nome completo.
-- ============================================================================

ALTER TABLE "users" ADD COLUMN "nickname" TEXT;
