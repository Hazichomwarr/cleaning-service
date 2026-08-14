"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { setCleaningRequestConfirmedPriceForAdmin, type CleaningRequestPriceResult } from "@/src/services/cleaning-request-price.service";

export async function setCleaningRequestConfirmedPriceAction(input: unknown): Promise<CleaningRequestPriceResult> {
  const admin = await requireAdmin();
  const result = await setCleaningRequestConfirmedPriceForAdmin(admin.id, input);
  if (result.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/requests");
    revalidatePath(`/admin/requests/${result.request.id}`);
  }
  return result;
}
