-- CreateTable: CSAT Responses (Customer Satisfaction Survey)
CREATE TABLE "csat_responses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "assignedToId" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "reviewNote" TEXT,
    "reviewedBy" TEXT,

    CONSTRAINT "csat_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "csat_responses_ticketId_key" ON "csat_responses"("ticketId");

-- CreateIndex
CREATE INDEX "csat_responses_assignedToId_idx" ON "csat_responses"("assignedToId");

-- CreateIndex
CREATE INDEX "csat_responses_respondedAt_idx" ON "csat_responses"("respondedAt");

-- CreateIndex
CREATE INDEX "csat_responses_rating_idx" ON "csat_responses"("rating");

-- CreateIndex
CREATE INDEX "csat_responses_ticketId_idx" ON "csat_responses"("ticketId");

-- AddForeignKey
ALTER TABLE "csat_responses" ADD CONSTRAINT "csat_responses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csat_responses" ADD CONSTRAINT "csat_responses_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
