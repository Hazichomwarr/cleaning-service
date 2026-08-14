"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../src/lib/auth/require-admin";
import { assignWorkerToCleaningRequestForAdmin } from "../../src/services/cleaning-request-assignment.service";

export async function assignWorkerToCleaningRequestAction(input: unknown) {
  const admin = await requireAdmin();
  const result = await assignWorkerToCleaningRequestForAdmin(admin.id, input);
  if (result.success) {
    revalidatePath("/admin"); revalidatePath("/admin/requests"); revalidatePath(`/admin/requests/${result.request.id}`); revalidatePath("/admin/schedule");
  }
  return result;
}
