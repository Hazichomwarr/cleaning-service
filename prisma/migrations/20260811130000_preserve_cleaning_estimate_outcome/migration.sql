-- CreateEnum
CREATE TYPE "CleaningEstimateOutcome" AS ENUM ('AUTOMATIC_ESTIMATE', 'MANUAL_QUOTE_REQUIRED', 'NO_CONFIGURED_ESTIMATE', 'ESTIMATE_UNAVAILABLE');

-- AlterTable
ALTER TABLE "CleaningRequest" ADD COLUMN "estimateOutcome" "CleaningEstimateOutcome" NOT NULL,
ALTER COLUMN "estimatedPrice" DROP NOT NULL;
