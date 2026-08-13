"use server";

import { requireAdmin } from "@/src/lib/auth/require-admin";
import { transitionCleaningRequestStatusForAdmin, type CleaningRequestLifecycleResult } from "@/src/services/cleaning-request-lifecycle.service";

export async function transitionCleaningRequestStatusAction(input: unknown): Promise<CleaningRequestLifecycleResult> {
  const admin = await requireAdmin();
  return transitionCleaningRequestStatusForAdmin(admin.id, input);
}
