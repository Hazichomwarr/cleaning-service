import { CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { canTransitionCleaningRequestStatus } from "../lib/cleaning-request-lifecycle";
import { CleaningRequestLifecycleInputSchema } from "../lib/validations/cleaning-request-lifecycle.schema";

type RequestRow = { id: string; requestNumber: string; status: CleaningRequestStatus };
type HistoryRow = { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: Date };
type Transaction = {
  cleaningRequest: { findUnique: (args: Record<string, unknown>) => Promise<RequestRow | null>; updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>; };
  cleaningRequestStatusHistory: { create: (args: Record<string, unknown>) => Promise<HistoryRow> };
};
type Database = { $transaction: <T>(callback: (transaction: Transaction) => Promise<T>) => Promise<T>; cleaningRequestStatusHistory: { findMany: (args: Record<string, unknown>) => Promise<Array<HistoryRow & { changedByAdminUser: { id: string; name: string; email: string } }>> } };

export type CleaningRequestLifecycleResult =
  | { success: true; request: { id: string; requestNumber: string; status: CleaningRequestStatus }; transition: { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: string } }
  | { success: false; reason: "INVALID_INPUT" | "REQUEST_NOT_FOUND" | "INVALID_TRANSITION" | "CANCELLATION_REASON_REQUIRED" | "STATUS_CONFLICT" | "INTERNAL_ERROR" };

export type CleaningRequestStatusHistoryItem = { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; changedAt: string; changedBy: { id: string; name: string; email: string } };

function safeHistory(row: HistoryRow): { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: string } { return { id: row.id, fromStatus: row.fromStatus, toStatus: row.toStatus, reason: row.reason, createdAt: row.createdAt.toISOString() }; }

export async function transitionCleaningRequestStatusForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date } = {}): Promise<CleaningRequestLifecycleResult> {
  const parsed = CleaningRequestLifecycleInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const transitionTime = options.now ?? new Date();
  try {
    return await database.$transaction(async (transaction) => {
      const current = await transaction.cleaningRequest.findUnique({ where: { id: parsed.data.cleaningRequestId }, select: { id: true, requestNumber: true, status: true } });
      if (!current) return { success: false, reason: "REQUEST_NOT_FOUND" };
      if (!canTransitionCleaningRequestStatus(current.status, parsed.data.toStatus)) return { success: false, reason: "INVALID_TRANSITION" };
      if (parsed.data.toStatus === CleaningRequestStatus.CANCELLED && !parsed.data.reason) return { success: false, reason: "CANCELLATION_REASON_REQUIRED" };
      const updated = await transaction.cleaningRequest.updateMany({ where: { id: current.id, status: current.status }, data: parsed.data.toStatus === CleaningRequestStatus.CANCELLED ? { status: parsed.data.toStatus, cancelledAt: transitionTime, cancellationReason: parsed.data.reason } : { status: parsed.data.toStatus } });
      if (updated.count !== 1) return { success: false, reason: "STATUS_CONFLICT" };
      const history = await transaction.cleaningRequestStatusHistory.create({ data: { cleaningRequestId: current.id, fromStatus: current.status, toStatus: parsed.data.toStatus, changedByAdminUserId: adminId, reason: parsed.data.reason, createdAt: transitionTime }, select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true } });
      return { success: true, request: { id: current.id, requestNumber: current.requestNumber, status: parsed.data.toStatus }, transition: safeHistory(history) };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { success: false, reason: "INTERNAL_ERROR" };
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

export async function getCleaningRequestStatusHistory(requestId: string, options: { database?: Database } = {}): Promise<CleaningRequestStatusHistoryItem[]> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const rows = await database.cleaningRequestStatusHistory.findMany({ where: { cleaningRequestId: requestId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, changedByAdminUser: { select: { id: true, name: true, email: true } } } });
  return rows.map((row) => ({ id: row.id, fromStatus: row.fromStatus, toStatus: row.toStatus, reason: row.reason, changedAt: row.createdAt.toISOString(), changedBy: row.changedByAdminUser }));
}
