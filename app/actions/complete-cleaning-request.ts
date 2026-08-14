"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { completeCleaningForAdmin, type CleaningRequestWorkflowResult } from "@/src/services/cleaning-request-workflow.service";

export async function completeCleaningRequestAction(input: unknown): Promise<CleaningRequestWorkflowResult> { const admin = await requireAdmin(); const result = await completeCleaningForAdmin(admin.id, input); if (result.success) { revalidatePath("/admin"); revalidatePath("/admin/requests"); revalidatePath(`/admin/requests/${result.request.id}`); revalidatePath("/admin/schedule"); } return result; }
