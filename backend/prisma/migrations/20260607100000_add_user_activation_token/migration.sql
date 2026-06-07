-- ============================================================================
-- Migration: add_user_activation_token
-- Token de ativação (uso único, 1h) para onboarding de agente via link
-- Models: UserActivationToken
-- Campos: User.activatedAt (backfill: usuários existentes marcados como ativos)
-- ============================================================================

-- Campo no User: data de ativação (null = pendente)
ALTER TABLE "users" ADD COLUMN "activatedAt" TIMESTAMP(3);

-- Tabela de tokens (armazena apenas o hash; o cru só existe no link)
CREATE TABLE "user_activation_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activation_tokens_pkey" PRIMARY KEY ("id")
);

-- Índice único para lookup rápido por hash do token (validação do link)
CREATE UNIQUE INDEX "user_activation_tokens_tokenHash_key" ON "user_activation_tokens"("tokenHash");

-- Índice auxiliar para queries por usuário (invalidar tokens anteriores)
CREATE INDEX "user_activation_tokens_userId_idx" ON "user_activation_tokens"("userId");

-- FK cascade: ao deletar usuário, deleta tokens
ALTER TABLE "user_activation_tokens"
    ADD CONSTRAINT "user_activation_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: usuários existentes já estão ativos (senha já definida)
UPDATE "users" SET "activatedAt" = NOW() WHERE "activatedAt" IS NULL;
