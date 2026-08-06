-- CreateEnum
CREATE TYPE "SalesProxySource" AS ENUM ('stock_delta', 'declared_delta');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "durationTag" TEXT,
ADD COLUMN     "familyConfidence" TEXT,
ADD COLUMN     "familyLabel" TEXT,
ADD COLUMN     "familySlug" TEXT,
ADD COLUMN     "soldTotal" INTEGER;

-- CreateTable
CREATE TABLE "SalesProxyEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "revenue" DECIMAL(18,4) NOT NULL,
    "source" "SalesProxySource" NOT NULL,
    "fromStock" INTEGER,
    "toStock" INTEGER,

    CONSTRAINT "SalesProxyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesProxyEvent_botId_capturedAt_idx" ON "SalesProxyEvent"("botId", "capturedAt");

-- CreateIndex
CREATE INDEX "SalesProxyEvent_productId_capturedAt_idx" ON "SalesProxyEvent"("productId", "capturedAt");

-- CreateIndex
CREATE INDEX "SalesProxyEvent_source_capturedAt_idx" ON "SalesProxyEvent"("source", "capturedAt");

-- CreateIndex
CREATE INDEX "Product_familySlug_idx" ON "Product"("familySlug");

-- AddForeignKey
ALTER TABLE "SalesProxyEvent" ADD CONSTRAINT "SalesProxyEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesProxyEvent" ADD CONSTRAINT "SalesProxyEvent_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
