import { NotificationType } from "../../generated/prisma/client";
import { z } from "zod";

const normalizedEmail = z.string().trim().toLowerCase().email();

export const CreateEmailNotificationSchema = z.object({
  type: z.enum(NotificationType),
  recipientEmail: normalizedEmail,
  recipientName: z.string().trim().max(200).transform((value) => value || null).optional(),
  subject: z.string().trim().min(1).max(998),
  html: z.string().trim().min(1),
  cleaningRequestId: z.string().trim().min(1).optional(),
}).strict();

export type CreateEmailNotificationInput = z.infer<typeof CreateEmailNotificationSchema>;
