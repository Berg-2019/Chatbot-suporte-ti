-- ============================================================================
-- Migration: add_crea_number
-- Registro profissional (CREA) do engenheiro responsável (ADMIN_ELECTRIC),
-- usado para validar/assinar laudos técnicos do setor ELECTRIC.
-- ============================================================================

ALTER TABLE "users" ADD COLUMN "creaNumber" TEXT;
ALTER TABLE "technical_report_signatures" ADD COLUMN "creaNumber" TEXT;
