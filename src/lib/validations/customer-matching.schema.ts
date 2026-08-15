import { z } from "zod";

const optionalContact = z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.string().max(200).optional().nullable());

export const CustomerMatchingInputSchema = z.object({
  email: z.preprocess((value) => typeof value === "string" ? value.trim().toLowerCase() : value, z.email().optional().nullable()),
  phone: optionalContact,
}).strict();

export type CustomerMatchingInput = z.input<typeof CustomerMatchingInputSchema>;
