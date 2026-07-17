-- ============================================================================
-- Migration: add_ticket_number
-- Número de chamado sequencial e legível (TK-YYYY-NNNN), no mesmo padrão do
-- TechnicalReport.number. Nullable nesta etapa para permitir backfill seguro
-- de tickets existentes antes de tornar a coluna obrigatória.
-- ============================================================================

ALTER TABLE "tickets" ADD COLUMN "number" TEXT;

CREATE UNIQUE INDEX "tickets_number_key" ON "tickets" ("number");
