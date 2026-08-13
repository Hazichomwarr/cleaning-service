"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { transitionCleaningRequestStatusForAdmin, type CleaningRequestLifecycleResult } from "@/src/services/cleaning-request-lifecycle.service";

export async function transitionCleaningRequestStatusAction(input: unknown): Promise<CleaningRequestLifecycleResult> {
  const admin = await requireAdmin();
  const result = await transitionCleaningRequestStatusForAdmin(admin.id, input);
  if (result.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${result.request.id}`);
  }
  return result;
}
