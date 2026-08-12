import { AdminCredentialsSchema, normalizeAdminEmail } from "@/src/lib/validations/admin-auth.schema";

export type AdminCredentialRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
};

export type SafeAdminIdentity = {
  id: string;
  name: string;
  email: string;
};

export type AdminCredentialDependencies = {
  findByEmail: (email: string) => Promise<AdminCredentialRecord | null>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
};

export async function authenticateAdmin(
  input: unknown,
  dependencies: AdminCredentialDependencies,
): Promise<SafeAdminIdentity | null> {
  const candidate = input && typeof input === "object"
    ? {
        ...(input as Record<string, unknown>),
        email: typeof (input as Record<string, unknown>).email === "string"
          ? normalizeAdminEmail((input as Record<string, unknown>).email as string)
          : (input as Record<string, unknown>).email,
      }
    : input;
  const parsed = AdminCredentialsSchema.safeParse(candidate);
  if (!parsed.success) return null;

  const email = normalizeAdminEmail(parsed.data.email);
  const admin = await dependencies.findByEmail(email);
  if (!admin || !admin.isActive) return null;
  if (!(await dependencies.verifyPassword(parsed.data.password, admin.passwordHash))) return null;

  return { id: admin.id, name: admin.name, email: admin.email };
}
