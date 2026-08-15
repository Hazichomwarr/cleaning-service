CREATE TABLE "CustomerVerificationChallenge" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "emailSnapshot" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerVerificationChallenge_customerId_createdAt_idx" ON "CustomerVerificationChallenge"("customerId", "createdAt");
CREATE INDEX "CustomerVerificationChallenge_expiresAt_idx" ON "CustomerVerificationChallenge"("expiresAt");

ALTER TABLE "CustomerVerificationChallenge" ADD CONSTRAINT "CustomerVerificationChallenge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
