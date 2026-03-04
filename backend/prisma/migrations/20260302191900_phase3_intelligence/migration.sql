-- CreateTable
CREATE TABLE "intent_classifications" (
    "id" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "intent" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "entities" JSONB,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "actionTaken" TEXT,
    "ticketId" TEXT,
    "processingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intent_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_metrics" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ticketsCreated" INTEGER NOT NULL DEFAULT 0,
    "ticketsResolved" INTEGER NOT NULL DEFAULT 0,
    "totalFirstResponseTime" INTEGER NOT NULL DEFAULT 0,
    "totalResolutionTime" INTEGER NOT NULL DEFAULT 0,
    "firstResponseCount" INTEGER NOT NULL DEFAULT 0,
    "resolutionCount" INTEGER NOT NULL DEFAULT 0,
    "csatSum" INTEGER NOT NULL DEFAULT 0,
    "csatCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agent_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_variables" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bot_variables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intent_classifications_intent_idx" ON "intent_classifications"("intent");

-- CreateIndex
CREATE INDEX "intent_classifications_phoneNumber_idx" ON "intent_classifications"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "agent_metrics_agentId_date_key" ON "agent_metrics"("agentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bot_variables_key_key" ON "bot_variables"("key");

-- AddForeignKey
ALTER TABLE "agent_metrics" ADD CONSTRAINT "agent_metrics_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
