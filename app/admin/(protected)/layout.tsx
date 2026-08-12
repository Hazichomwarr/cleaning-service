import { requireAdmin } from "@/src/lib/auth/require-admin";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
