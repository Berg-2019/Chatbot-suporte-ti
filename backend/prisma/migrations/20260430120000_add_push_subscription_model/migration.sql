-- ============================================================================
-- Migration: add_push_subscription_model
-- Phase 6: Push notifications - Web Push subscriptions for ticket/purchase
-- notifications
-- ============================================================================

CREATE TABLE "push_subscriptions" (
  "id"        TEXT    NOT NULL DEFAULT uuid_generate_v4()::text,
  "userId"    TEXT    NOT NULL,
  "endpoint"  TEXT    NOT NULL,
  "p256dh"    TEXT    NOT NULL,
  "auth"      TEXT    NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint")
);

CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;