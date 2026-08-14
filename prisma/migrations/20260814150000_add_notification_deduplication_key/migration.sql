ALTER TABLE "Notification" ADD COLUMN "deduplicationKey" TEXT;

CREATE UNIQUE INDEX "Notification_deduplicationKey_key" ON "Notification"("deduplicationKey");
