import { z } from "zod";

const optionalContact = z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.union([z.string().max(120), z.literal(""), z.null(), z.undefined()]).transform((value) => value || null));
export const WorkerCreationInputSchema = z.object({
  firstName: z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.string().min(1).max(80)),
  lastName: z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.string().min(1).max(80)),
  phone: optionalContact,
  email: z.preprocess((value) => typeof value === "string" ? value.trim().toLowerCase() : value, z.union([z.email(), z.literal(""), z.null(), z.undefined()]).transform((value) => value || null)),
  type: z.enum(["CREW", "CONTRACTOR"]),
  allowDuplicateContact: z.boolean().optional().default(false),
}).strict().superRefine((value, context) => { if (!value.phone && !value.email) context.addIssue({ code: "custom", path: ["phone"], message: "Enter a phone number or email address." }); });

export const WorkerActiveStateInputSchema = z.object({ workerId: z.string().trim().min(1), isActive: z.boolean() }).strict();
