-- CreateTable
CREATE TABLE "CleaningRequestStatusHistory" (
    "id" TEXT NOT NULL,
    "cleaningRequestId" TEXT NOT NULL,
    "fromStatus" "CleaningRequestStatus" NOT NULL,
    "toStatus" "CleaningRequestStatus" NOT NULL,
    "changedByAdminUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningRequestStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningRequestStatusHistory_cleaningRequestId_createdAt_idx" ON "CleaningRequestStatusHistory"("cleaningRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "CleaningRequestStatusHistory_changedByAdminUserId_createdAt_idx" ON "CleaningRequestStatusHistory"("changedByAdminUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "CleaningRequestStatusHistory" ADD CONSTRAINT "CleaningRequestStatusHistory_cleaningRequestId_fkey" FOREIGN KEY ("cleaningRequestId") REFERENCES "CleaningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningRequestStatusHistory" ADD CONSTRAINT "CleaningRequestStatusHistory_changedByAdminUserId_fkey" FOREIGN KEY ("changedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
