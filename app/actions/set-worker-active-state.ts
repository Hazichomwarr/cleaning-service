"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { setWorkerActiveStateForAdmin, type WorkerActiveStateResult } from "@/src/services/worker.service";

export async function setWorkerActiveStateAction(input: unknown): Promise<WorkerActiveStateResult> { await requireAdmin(); const result = await setWorkerActiveStateForAdmin(input); if (result.status === "SUCCESS") { revalidatePath("/admin/workers"); revalidatePath(`/admin/workers/${result.worker.id}`); revalidatePath("/admin/requests"); } return result; }
