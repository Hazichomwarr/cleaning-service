import { z } from "zod";

const moneyInput = z.preprocess((value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value.toString() : value;
  if (typeof value === "string") return value.trim();
  return value;
}, z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a price in dollars and cents."));

export const CleaningRequestConfirmedPriceInputSchema = z.object({
  cleaningRequestId: z.string().trim().min(1),
  confirmedPrice: moneyInput,
  reason: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(500).nullable().optional()),
}).strict();

export type CleaningRequestConfirmedPriceInput = z.infer<typeof CleaningRequestConfirmedPriceInputSchema>;
