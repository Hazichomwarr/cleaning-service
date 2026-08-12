import { requireAdmin } from "@/src/lib/auth/require-admin";
import { logoutAdmin } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell admin={admin} logoutAction={logoutAdmin}>{children}</AdminShell>;
}
