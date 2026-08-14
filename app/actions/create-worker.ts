"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { createWorkerForAdmin, type WorkerCreationResult } from "@/src/services/worker.service";

export async function createWorkerAction(input: unknown): Promise<WorkerCreationResult> { await requireAdmin(); const result = await createWorkerForAdmin(input); if (result.status === "SUCCESS") revalidatePath("/admin/workers"); return result; }
