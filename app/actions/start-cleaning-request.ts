"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { startCleaningForAdmin, type CleaningRequestWorkflowResult } from "@/src/services/cleaning-request-workflow.service";

export async function startCleaningRequestAction(input: unknown): Promise<CleaningRequestWorkflowResult> { const admin = await requireAdmin(); const result = await startCleaningForAdmin(admin.id, input); if (result.success) { revalidatePath("/admin"); revalidatePath("/admin/requests"); revalidatePath(`/admin/requests/${result.request.id}`); revalidatePath("/admin/schedule"); } return result; }
