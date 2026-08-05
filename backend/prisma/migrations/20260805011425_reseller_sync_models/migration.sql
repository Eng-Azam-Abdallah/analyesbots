/*
  Warnings:

  - You are about to alter the column `price` on the `PriceSnapshot` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `currentPrice` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - Added the required column `stock` to the `PriceSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wholesalePrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MarketChangeKind" AS ENUM ('up', 'down', 'new', 'gone', 'stock_up', 'stock_down');

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('ok', 'error');

-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'reseller_api';

-- AlterTable
ALTER TABLE "PriceSnapshot" ADD COLUMN     "stock" INTEGER NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "basePrice" DECIMAL(18,4),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USDT',
ADD COLUMN     "deliveryInstruction" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "offerPrice" DECIMAL(18,4),
ADD COLUMN     "rawPayload" JSONB,
ADD COLUMN     "regularPrice" DECIMAL(18,4),
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wholesalePrice" DECIMAL(18,4) NOT NULL,
ALTER COLUMN "currentPrice" SET DATA TYPE DECIMAL(18,4);

-- CreateTable
CREATE TABLE "MarketChange" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "MarketChangeKind" NOT NULL,
    "fromPrice" DECIMAL(18,4),
    "toPrice" DECIMAL(18,4),
    "changePercent" DECIMAL(10,4),
    "fromStock" INTEGER,
    "toStock" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "balance" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "status" "SyncRunStatus" NOT NULL,
    "productsSeen" INTEGER NOT NULL DEFAULT 0,
    "changesDetected" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketChange_kind_capturedAt_idx" ON "MarketChange"("kind", "capturedAt");

-- CreateIndex
CREATE INDEX "MarketChange_productId_capturedAt_idx" ON "MarketChange"("productId", "capturedAt");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_botId_capturedAt_idx" ON "BalanceSnapshot"("botId", "capturedAt");

-- CreateIndex
CREATE INDEX "SyncRun_botId_startedAt_idx" ON "SyncRun"("botId", "startedAt");

-- CreateIndex
CREATE INDEX "Product_botId_idx" ON "Product"("botId");

-- AddForeignKey
ALTER TABLE "MarketChange" ADD CONSTRAINT "MarketChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
