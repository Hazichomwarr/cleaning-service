-- CreateEnum
CREATE TYPE "CleaningAssignmentHistoryAction" AS ENUM ('ASSIGNED', 'REMOVED');

-- CreateTable
CREATE TABLE "CleaningRequestAssignmentHistory" (
    "id" TEXT NOT NULL,
    "cleaningRequestId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "action" "CleaningAssignmentHistoryAction" NOT NULL,
    "changedByAdminUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningRequestAssignmentHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CleaningRequestAssignmentHistory_cleaningRequestId_createdAt_idx" ON "CleaningRequestAssignmentHistory"("cleaningRequestId", "createdAt");
CREATE INDEX "CleaningRequestAssignmentHistory_workerId_createdAt_idx" ON "CleaningRequestAssignmentHistory"("workerId", "createdAt");
CREATE INDEX "CleaningRequestAssignmentHistory_changedByAdminUserId_createdAt_idx" ON "CleaningRequestAssignmentHistory"("changedByAdminUserId", "createdAt");

ALTER TABLE "CleaningRequestAssignmentHistory" ADD CONSTRAINT "CleaningRequestAssignmentHistory_cleaningRequestId_fkey" FOREIGN KEY ("cleaningRequestId") REFERENCES "CleaningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningRequestAssignmentHistory" ADD CONSTRAINT "CleaningRequestAssignmentHistory_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleaningRequestAssignmentHistory" ADD CONSTRAINT "CleaningRequestAssignmentHistory_changedByAdminUserId_fkey" FOREIGN KEY ("changedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
