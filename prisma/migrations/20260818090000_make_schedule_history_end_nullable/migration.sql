-- Preserve existing historical appointment ends while allowing new single-time events.
ALTER TABLE "CleaningRequestScheduleHistory"
ALTER COLUMN "newScheduledEnd" DROP NOT NULL;
