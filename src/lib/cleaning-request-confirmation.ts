import type { CleaningRequestStatus } from "../generated/prisma/client";

export type CleaningRequestConfirmationFacts = {
  status: CleaningRequestStatus;
  confirmedPrice: { gt: (value: number) => boolean } | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
};

export type ConfirmationMissingRequirement = "CONFIRMED_PRICE" | "SCHEDULE_START";
export type ConfirmationInvalidRequirement = "CONFIRMED_PRICE";
export type ConfirmationReadiness = { ready: boolean; missing: ConfirmationMissingRequirement[]; invalid: ConfirmationInvalidRequirement[] };

export function getCleaningRequestConfirmationReadiness(facts: CleaningRequestConfirmationFacts): ConfirmationReadiness {
  if (facts.status !== "REVIEWING") return { ready: false, missing: [], invalid: [] };
  const missing: ConfirmationMissingRequirement[] = [];
  const invalid: ConfirmationInvalidRequirement[] = [];
  if (!facts.confirmedPrice) missing.push("CONFIRMED_PRICE");
  else if (!facts.confirmedPrice.gt(0)) invalid.push("CONFIRMED_PRICE");
  if (!facts.scheduledStart) missing.push("SCHEDULE_START");
  return { ready: missing.length === 0 && invalid.length === 0, missing, invalid };
}
