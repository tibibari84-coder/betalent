-- CreateEnum
CREATE TYPE "ReversalStatus" AS ENUM ('NONE', 'PENDING', 'PARTIAL', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PurchaseRiskStatus" AS ENUM ('NONE', 'REFUND_REPORTED', 'DISPUTE_OPEN', 'DISPUTE_WON', 'DISPUTE_LOST');

-- AlterTable
ALTER TABLE "CoinPurchaseOrder"
ADD COLUMN "riskStatus" "PurchaseRiskStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "reversalStatus" "ReversalStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "refundedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reversedCoins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unrecoveredCoins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reversalUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PurchaseReversalCase" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CoinPurchaseProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "providerDisputeId" TEXT,
    "eventType" TEXT NOT NULL,
    "riskStatus" "PurchaseRiskStatus" NOT NULL DEFAULT 'NONE',
    "reversalStatus" "ReversalStatus" NOT NULL DEFAULT 'PENDING',
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "targetReversalCoins" INTEGER NOT NULL DEFAULT 0,
    "reversedCoins" INTEGER NOT NULL DEFAULT 0,
    "unrecoveredCoins" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "PurchaseReversalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorEarningsRiskHold" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "reversalCaseId" TEXT NOT NULL,
    "giftTransactionId" TEXT NOT NULL,
    "atRiskCoins" INTEGER NOT NULL,
    "status" "ReversalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreatorEarningsRiskHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReversalCase_provider_providerEventId_key" ON "PurchaseReversalCase"("provider", "providerEventId");
CREATE UNIQUE INDEX "PurchaseReversalCase_provider_providerRefundId_key" ON "PurchaseReversalCase"("provider", "providerRefundId");
CREATE UNIQUE INDEX "PurchaseReversalCase_provider_providerDisputeId_key" ON "PurchaseReversalCase"("provider", "providerDisputeId");
CREATE INDEX "PurchaseReversalCase_orderId_idx" ON "PurchaseReversalCase"("orderId");
CREATE INDEX "PurchaseReversalCase_userId_idx" ON "PurchaseReversalCase"("userId");
CREATE INDEX "PurchaseReversalCase_riskStatus_idx" ON "PurchaseReversalCase"("riskStatus");
CREATE INDEX "PurchaseReversalCase_reversalStatus_idx" ON "PurchaseReversalCase"("reversalStatus");

CREATE UNIQUE INDEX "CreatorEarningsRiskHold_reversalCaseId_giftTransactionId_key" ON "CreatorEarningsRiskHold"("reversalCaseId", "giftTransactionId");
CREATE INDEX "CreatorEarningsRiskHold_creatorId_idx" ON "CreatorEarningsRiskHold"("creatorId");
CREATE INDEX "CreatorEarningsRiskHold_reversalCaseId_idx" ON "CreatorEarningsRiskHold"("reversalCaseId");
CREATE INDEX "CreatorEarningsRiskHold_status_idx" ON "CreatorEarningsRiskHold"("status");

-- AddForeignKey
ALTER TABLE "PurchaseReversalCase" ADD CONSTRAINT "PurchaseReversalCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CoinPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReversalCase" ADD CONSTRAINT "PurchaseReversalCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorEarningsRiskHold" ADD CONSTRAINT "CreatorEarningsRiskHold_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorEarningsRiskHold" ADD CONSTRAINT "CreatorEarningsRiskHold_reversalCaseId_fkey" FOREIGN KEY ("reversalCaseId") REFERENCES "PurchaseReversalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
