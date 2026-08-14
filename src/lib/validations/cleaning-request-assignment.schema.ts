import { z } from "zod";

const base = { cleaningRequestId: z.string().trim().min(1), workerId: z.string().trim().min(1) };
const reason = z.string().trim().max(500).optional();

export const AssignWorkerInputSchema = z.object({ ...base, reason }).strict();
export const RemoveWorkerInputSchema = z.object({ ...base, reason: z.string().trim().max(500) }).strict();
