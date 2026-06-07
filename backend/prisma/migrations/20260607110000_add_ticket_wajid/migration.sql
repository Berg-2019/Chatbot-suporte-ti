-- ============================================================================
-- Migration: add_ticket_wajid
-- Armazena o jid completo do WhatsApp de origem (suporta @lid) para responder
-- ============================================================================

ALTER TABLE "tickets" ADD COLUMN "waJid" TEXT;

-- Índice auxiliar para lookup por jid (resposta a mensagens entrantes)
CREATE INDEX "tickets_waJid_idx" ON "tickets"("waJid") WHERE "waJid" IS NOT NULL;
