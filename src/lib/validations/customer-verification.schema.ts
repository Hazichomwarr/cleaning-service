import { z } from "zod";

export const StartReturningCustomerVerificationSchema = z.object({
  email: z.preprocess((value) => typeof value === "string" ? value.trim().toLowerCase() : value, z.email().optional().nullable()),
  phone: z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.string().max(200).optional().nullable()),
}).strict();

export const VerifyReturningCustomerCodeSchema = z.object({
  challengeId: z.string().trim().min(1),
  code: z.string().regex(/^\d{6}$/),
}).strict();
