-- ============================================================================
-- Migration: add_sla_engine
-- Phase 3: SlaPolicy, BusinessHours, SlaTimer, EscalationRule
-- ============================================================================

-- Create enum
CREATE TYPE "EscalationTrigger" AS ENUM (
  'NO_RESPONSE', 'NO_RESOLUTION', 'SLA_BREACH_IMMINENT', 'SLA_BREACHED'
);

-- ============================================================================
-- BusinessHours table
-- ============================================================================
CREATE TABLE "business_hours" (
  "id"        TEXT    NOT NULL DEFAULT uuid_generate_v4()::text,
  "name"      TEXT    NOT NULL,
  "timezone"  TEXT    NOT NULL DEFAULT 'America/Sao_Paulo',
  "schedule"  JSONB   NOT NULL DEFAULT '{"mon":{"start":"08:00","end":"18:00"},"tue":{"start":"08:00","end":"18:00"},"wed":{"start":"08:00","end":"18:00"},"thu":{"start":"08:00","end":"18:00"},"fri":{"start":"08:00","end":"18:00"}}',
  "holidays"  JSONB,
  CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- SlaPolicies table
-- ============================================================================
CREATE TABLE "sla_policies" (
  "id"                TEXT    NOT NULL DEFAULT uuid_generate_v4()::text,
  "name"              TEXT    NOT NULL,
  "sector"            "Sector" NOT NULL,
  "priority"          "Priority" NOT NULL,
  "responseTimeMins"  INTEGER NOT NULL,
  "resolutionTimeMins" INTEGER NOT NULL,
  "businessHoursId"   TEXT,
  "active"            BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sla_policies_sector_priority_key" UNIQUE ("sector", "priority"),
  CONSTRAINT "sla_policies_businessHoursId_fkey"
    FOREIGN KEY ("businessHoursId") REFERENCES "business_hours"("id") ON DELETE SET NULL
);

-- ============================================================================
-- SlaTimers table (1:1 com Ticket)
-- ============================================================================
CREATE TABLE "sla_timers" (
  "id"                 TEXT    NOT NULL,
  "ticketId"          TEXT    NOT NULL,
  "policyId"          TEXT,
  "startedAt"         TIMESTAMP NOT NULL DEFAULT now(),
  "pausedAt"          TIMESTAMP,
  "resumedAt"         TIMESTAMP,
  "responseDueAt"    TIMESTAMP NOT NULL,
  "resolutionDueAt"  TIMESTAMP NOT NULL,
  "responseMetAt"     TIMESTAMP,
  "resolutionMetAt"  TIMESTAMP,
  "responseBreached"  BOOLEAN NOT NULL DEFAULT false,
  "resolutionBreached" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "sla_timers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sla_timers_ticketId_key" UNIQUE ("ticketId"),
  CONSTRAINT "sla_timers_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE
);

CREATE INDEX "sla_timers_responseDueAt_responseMetAt_idx" ON "sla_timers"("responseDueAt", "responseMetAt");
CREATE INDEX "sla_timers_resolutionDueAt_resolutionMetAt_idx" ON "sla_timers"("resolutionDueAt", "resolutionMetAt");

-- ============================================================================
-- EscalationRules table
-- ============================================================================
CREATE TABLE "escalation_rules" (
  "id"               TEXT    NOT NULL DEFAULT uuid_generate_v4()::text,
  "name"             TEXT    NOT NULL,
  "sector"           "Sector" NOT NULL,
  "triggerAfterMins" INTEGER NOT NULL,
  "triggerOn"        "EscalationTrigger" NOT NULL,
  "action"           JSONB   NOT NULL,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "escalation_rules_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Add SlaTimer relation to Ticket (already in schema, just confirm)
-- ticket.affectedAssetId already added in Phase 2 migration
-- ============================================================================