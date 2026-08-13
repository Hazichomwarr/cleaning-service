import { z } from "zod";
import { CleaningRequestStatus } from "../../generated/prisma/client";

export const CleaningRequestLifecycleInputSchema = z.object({
  cleaningRequestId: z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.string().min(1)),
  toStatus: z.enum(CleaningRequestStatus),
  reason: z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.string().max(500).optional().nullable()).transform((value) => value || null),
}).strict();

export type CleaningRequestLifecycleInput = z.input<typeof CleaningRequestLifecycleInputSchema>;
