-- AddMessageMediaAndReads
-- Migration: Add VIDEO to MessageType, add media fields and MessageRead model
-- Created: 2026-05-04

BEGIN;

-- Add VIDEO to MessageType enum
CREATE TYPE "MessageType_new" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT');
ALTER TABLE "messages" ALTER COLUMN "type" TYPE "MessageType_new" USING ("type"::text::"MessageType_new");
DROP TYPE "MessageType";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";

-- Add media fields to messages table
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

-- Create message_reads table
CREATE TABLE "message_reads" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "messageId" UUID NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "readAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX "message_reads_messageId_userId_idx" ON "message_reads"("messageId", "userId");
CREATE INDEX "message_reads_userId_idx" ON "message_reads"("userId");

COMMIT;