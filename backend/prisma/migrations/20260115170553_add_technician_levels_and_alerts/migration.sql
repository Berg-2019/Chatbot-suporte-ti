-- CreateEnum
CREATE TYPE "TechnicianLevel" AS ENUM ('N1', 'N2', 'N3');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NEW_TICKET', 'ESCALATED', 'SLA_WARNING', 'SLA_BREACH', 'NEW_MESSAGE', 'TRANSFERRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "glpiGroupId" INTEGER,
ADD COLUMN     "glpiUserId" INTEGER,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "receiveAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "technicianLevel" "TechnicianLevel" NOT NULL DEFAULT 'N1';

-- CreateTable
CREATE TABLE "technician_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "glpiId" INTEGER,
    "type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "sentViaWa" BOOLEAN NOT NULL DEFAULT false,
    "sentViaPush" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "technician_alerts_userId_idx" ON "technician_alerts"("userId");

-- CreateIndex
CREATE INDEX "technician_alerts_ticketId_idx" ON "technician_alerts"("ticketId");

-- AddForeignKey
ALTER TABLE "technician_alerts" ADD CONSTRAINT "technician_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
