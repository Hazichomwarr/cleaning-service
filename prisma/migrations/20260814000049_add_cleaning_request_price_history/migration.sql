-- CreateTable
CREATE TABLE "CleaningRequestPriceHistory" (
    "id" TEXT NOT NULL,
    "cleaningRequestId" TEXT NOT NULL,
    "previousConfirmedPrice" DECIMAL(10,2),
    "newConfirmedPrice" DECIMAL(10,2) NOT NULL,
    "changedByAdminUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningRequestPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningRequestPriceHistory_cleaningRequestId_createdAt_idx" ON "CleaningRequestPriceHistory"("cleaningRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "CleaningRequestPriceHistory_changedByAdminUserId_createdAt_idx" ON "CleaningRequestPriceHistory"("changedByAdminUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "CleaningRequestPriceHistory" ADD CONSTRAINT "CleaningRequestPriceHistory_cleaningRequestId_fkey" FOREIGN KEY ("cleaningRequestId") REFERENCES "CleaningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningRequestPriceHistory" ADD CONSTRAINT "CleaningRequestPriceHistory_changedByAdminUserId_fkey" FOREIGN KEY ("changedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
