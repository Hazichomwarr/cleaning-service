import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db/prisma";

import type { SafeAdminIdentity } from "./admin-credentials";

export type { SafeAdminIdentity } from "./admin-credentials";

export async function requireAdmin(): Promise<SafeAdminIdentity> {
  const session = await auth();
  const adminId = session?.user?.id;

  if (!adminId) redirect("/admin/login");

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, email: true, isActive: true },
  });

  if (!admin?.isActive) redirect("/admin/login");

  return { id: admin.id, name: admin.name, email: admin.email };
}
