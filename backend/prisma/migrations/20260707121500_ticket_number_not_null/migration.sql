-- ============================================================================
-- Migration: ticket_number_not_null
-- Torna Ticket.number obrigatório. Só aplicar após confirmar que o backfill
-- (prisma/migrations-data/backfill-ticket-numbers.ts) rodou com sucesso e
-- não há mais nenhum ticket com number = NULL.
-- ============================================================================

ALTER TABLE "tickets" ALTER COLUMN "number" SET NOT NULL;
