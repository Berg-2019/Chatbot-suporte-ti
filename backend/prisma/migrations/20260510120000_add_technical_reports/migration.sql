-- ============================================================================
-- Migration: add_technical_reports
-- Laudos técnicos de serviço (NR-10/NR-35) com mídia + assinaturas
-- Models: TechnicalReport, TechnicalReportMedia, TechnicalReportAnnotation,
--         TechnicalReportSignature
-- Enums: TechnicalReportStatus, SignerRole
-- ============================================================================

-- Enums
CREATE TYPE "TechnicalReportStatus" AS ENUM (
  'DRAFT', 'SUBMITTED', 'REWORK', 'APPROVED'
);

CREATE TYPE "SignerRole" AS ENUM (
  'ENGINEER', 'TECHNICIAN', 'CLIENT'
);

-- ============================================================================
-- technical_reports
-- ============================================================================
CREATE TABLE "technical_reports" (
  "id"           TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
  "number"       TEXT NOT NULL,
  "sector"       "Sector" NOT NULL,
  "title"        TEXT NOT NULL,
  "site"         TEXT NOT NULL,
  "serviceDate"  TIMESTAMP NOT NULL,
  "engineerId"   TEXT,
  "technicianId" TEXT,
  "assistants"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "summary"      TEXT NOT NULL,
  "execution"    TEXT NOT NULL,
  "materials"    TEXT NOT NULL,
  "observations" TEXT NOT NULL,
  "status"       "TechnicalReportStatus" NOT NULL DEFAULT 'DRAFT',
  "ticketId"     TEXT,
  "createdById"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT now(),
  "deletedAt"    TIMESTAMP,
  CONSTRAINT "technical_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technical_reports_number_key"
  ON "technical_reports" ("number");

CREATE INDEX "technical_reports_sector_status_idx"
  ON "technical_reports" ("sector", "status");

CREATE INDEX "technical_reports_serviceDate_idx"
  ON "technical_reports" ("serviceDate");

CREATE INDEX "technical_reports_createdById_idx"
  ON "technical_reports" ("createdById");

CREATE INDEX "technical_reports_deletedAt_idx"
  ON "technical_reports" ("deletedAt");

ALTER TABLE "technical_reports"
  ADD CONSTRAINT "technical_reports_engineerId_fkey"
  FOREIGN KEY ("engineerId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "technical_reports"
  ADD CONSTRAINT "technical_reports_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "technical_reports"
  ADD CONSTRAINT "technical_reports_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "technical_reports"
  ADD CONSTRAINT "technical_reports_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- technical_report_media
-- ============================================================================
CREATE TABLE "technical_report_media" (
  "id"         TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
  "reportId"   TEXT NOT NULL,
  "filename"   TEXT NOT NULL,
  "path"       TEXT NOT NULL,
  "mimeType"   TEXT NOT NULL,
  "size"       INTEGER NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "technical_report_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "technical_report_media_reportId_idx"
  ON "technical_report_media" ("reportId");

ALTER TABLE "technical_report_media"
  ADD CONSTRAINT "technical_report_media_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "technical_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- technical_report_annotations
-- ============================================================================
CREATE TABLE "technical_report_annotations" (
  "id"         TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
  "reportId"   TEXT NOT NULL,
  "authorId"   TEXT NOT NULL,
  "authorRole" "SignerRole" NOT NULL,
  "field"      TEXT NOT NULL,
  "comment"    TEXT NOT NULL,
  "resolved"   BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "technical_report_annotations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "technical_report_annotations_reportId_resolved_idx"
  ON "technical_report_annotations" ("reportId", "resolved");

ALTER TABLE "technical_report_annotations"
  ADD CONSTRAINT "technical_report_annotations_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "technical_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "technical_report_annotations"
  ADD CONSTRAINT "technical_report_annotations_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- technical_report_signatures
-- ============================================================================
CREATE TABLE "technical_report_signatures" (
  "id"         TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
  "reportId"   TEXT NOT NULL,
  "signerId"   TEXT,
  "signerName" TEXT NOT NULL,
  "role"       "SignerRole" NOT NULL,
  "imagePath"  TEXT NOT NULL,
  "ip"         TEXT,
  "signedAt"   TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "technical_report_signatures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "technical_report_signatures_reportId_idx"
  ON "technical_report_signatures" ("reportId");

ALTER TABLE "technical_report_signatures"
  ADD CONSTRAINT "technical_report_signatures_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "technical_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "technical_report_signatures"
  ADD CONSTRAINT "technical_report_signatures_signerId_fkey"
  FOREIGN KEY ("signerId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
