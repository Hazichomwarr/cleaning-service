"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../src/lib/auth/require-admin";
import { removeWorkerFromCleaningRequestForAdmin } from "../../src/services/cleaning-request-assignment.service";

export async function removeWorkerFromCleaningRequestAction(input: unknown) {
  const admin = await requireAdmin();
  const result = await removeWorkerFromCleaningRequestForAdmin(admin.id, input);
  if (result.success) {
    revalidatePath("/admin"); revalidatePath("/admin/requests"); revalidatePath(`/admin/requests/${result.request.id}`); revalidatePath("/admin/schedule");
  }
  return result;
}
