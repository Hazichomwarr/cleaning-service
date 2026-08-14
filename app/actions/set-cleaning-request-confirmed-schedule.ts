"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { setCleaningRequestConfirmedScheduleForAdmin, type CleaningRequestScheduleResult } from "@/src/services/cleaning-request-schedule.service";

export async function setCleaningRequestConfirmedScheduleAction(input: unknown): Promise<CleaningRequestScheduleResult> {
  const admin = await requireAdmin();
  const result = await setCleaningRequestConfirmedScheduleForAdmin(admin.id, input);
  if (result.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${result.request.id}`);
    revalidatePath("/admin/schedule");
  }
  return result;
}
