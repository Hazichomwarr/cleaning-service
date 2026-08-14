import { z } from "zod";

export const CleaningRequestWorkflowInputSchema = z.object({ cleaningRequestId: z.string().trim().min(1) }).strict();
