"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { AdminCredentialsSchema, normalizeAdminEmail } from "@/src/lib/validations/admin-auth.schema";

export type AdminLoginState = {
  error?: string;
  email?: string;
};

export async function loginAdmin(_: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? normalizeAdminEmail(emailValue) : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const parsed = AdminCredentialsSchema.safeParse({ email, password });

  if (!parsed.success) return { error: "Enter a valid email and password.", email };

  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password.", email };
    throw error;
  }

  return { email };
}
