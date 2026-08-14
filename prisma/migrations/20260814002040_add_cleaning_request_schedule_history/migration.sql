-- CreateTable
CREATE TABLE "CleaningRequestScheduleHistory" (
    "id" TEXT NOT NULL,
    "cleaningRequestId" TEXT NOT NULL,
    "previousScheduledStart" TIMESTAMP(3),
    "previousScheduledEnd" TIMESTAMP(3),
    "newScheduledStart" TIMESTAMP(3) NOT NULL,
    "newScheduledEnd" TIMESTAMP(3) NOT NULL,
    "changedByAdminUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningRequestScheduleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningRequestScheduleHistory_cleaningRequestId_createdAt_idx" ON "CleaningRequestScheduleHistory"("cleaningRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "CleaningRequestScheduleHistory_changedByAdminUserId_created_idx" ON "CleaningRequestScheduleHistory"("changedByAdminUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "CleaningRequestScheduleHistory" ADD CONSTRAINT "CleaningRequestScheduleHistory_cleaningRequestId_fkey" FOREIGN KEY ("cleaningRequestId") REFERENCES "CleaningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningRequestScheduleHistory" ADD CONSTRAINT "CleaningRequestScheduleHistory_changedByAdminUserId_fkey" FOREIGN KEY ("changedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
