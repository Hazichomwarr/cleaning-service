import { z } from "zod";

export const AdminCredentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
}).strict();

export type AdminCredentials = z.infer<typeof AdminCredentialsSchema>;

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}
