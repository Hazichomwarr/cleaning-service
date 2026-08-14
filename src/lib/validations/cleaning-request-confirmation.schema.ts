import { z } from "zod";

export const CleaningRequestConfirmationInputSchema = z.object({ cleaningRequestId: z.string().trim().min(1) }).strict();
