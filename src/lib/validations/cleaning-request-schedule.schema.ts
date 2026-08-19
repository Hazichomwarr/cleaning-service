import { z } from "zod";

export const CleaningRequestConfirmedScheduleInputSchema = z.object({
  cleaningRequestId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(500).nullable().optional()),
}).strict();
