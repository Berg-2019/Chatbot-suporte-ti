-- Add missing columns to bot_variables
ALTER TABLE "bot_variables" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "bot_variables" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bot_variables" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
