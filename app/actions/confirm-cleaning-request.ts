"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../src/lib/auth/require-admin";
import { confirmCleaningRequestForAdmin } from "../../src/services/cleaning-request-confirmation.service";

export async function confirmCleaningRequestAction(input: unknown) {
  const admin = await requireAdmin();
  const result = await confirmCleaningRequestForAdmin(admin.id, input);
  if (result.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${result.request.id}`);
  }
  return result;
}
