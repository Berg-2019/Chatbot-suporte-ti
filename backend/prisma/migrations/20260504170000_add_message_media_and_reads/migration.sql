-- AddMessageMediaAndReads
-- Migration: Add VIDEO to MessageType, add media fields and MessageRead model
-- Created: 2026-05-04
-- Corrigida em 2026-06-30: a versão original falhava em banco vazio com
-- "default for column type cannot be cast automatically" (precisa dropar o
-- DEFAULT antes de trocar o tipo do enum) e usava UUID nativo pra
-- message_reads.id/messageId/userId, incompatível com o resto do schema
-- (todas as PKs são TEXT, geradas pelo Prisma em JS, não gen_random_uuid()).

BEGIN;

-- Add VIDEO to MessageType enum
ALTER TABLE "messages" ALTER COLUMN "type" DROP DEFAULT;
CREATE TYPE "MessageType_new" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT');
ALTER TABLE "messages" ALTER COLUMN "type" TYPE "MessageType_new" USING ("type"::text::"MessageType_new");
DROP TYPE "MessageType";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
ALTER TABLE "messages" ALTER COLUMN "type" SET DEFAULT 'TEXT'::"MessageType";

-- Add media fields to messages table
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

-- Create message_reads table (ids TEXT, consistente com o resto do schema)
CREATE TABLE "message_reads" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE UNIQUE INDEX "message_reads_messageId_userId_key" ON "message_reads"("messageId", "userId");
CREATE INDEX "message_reads_userId_idx" ON "message_reads"("userId");

COMMIT;
