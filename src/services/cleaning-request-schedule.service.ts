import { CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { parseBusinessDateTime } from "../lib/business-time";
import { CleaningRequestConfirmedScheduleInputSchema } from "../lib/validations/cleaning-request-schedule.schema";

type RequestRow = { id: string; requestNumber: string; status: CleaningRequestStatus; scheduledStart: Date | null; scheduledEnd: Date | null };
type HistoryRow = { id: string; previousScheduledStart: Date | null; previousScheduledEnd: Date | null; newScheduledStart: Date; newScheduledEnd: Date | null; reason: string | null; createdAt: Date };
type Transaction = {
  cleaningRequest: { findUnique: (args: Record<string, unknown>) => Promise<RequestRow | null>; updateMany: (args: Record<string, unknown>) => Promise<{ count: number }> };
  cleaningRequestScheduleHistory: { create: (args: Record<string, unknown>) => Promise<HistoryRow> };
};
type Database = { $transaction: <T>(callback: (transaction: Transaction) => Promise<T>) => Promise<T> };

export type CleaningRequestScheduleResult =
  | { success: true; request: { id: string; requestNumber: string; status: CleaningRequestStatus; scheduledStart: string; scheduledEnd: null }; history: { id: string; previousScheduledStart: string | null; previousScheduledEnd: string | null; newScheduledStart: string; newScheduledEnd: null; reason: string | null; createdAt: string } }
  | { success: false; reason: "INVALID_INPUT" | "REQUEST_NOT_FOUND" | "INVALID_REQUEST_STATUS" | "INVALID_LOCAL_TIME" | "SCHEDULE_IN_PAST" | "NO_SCHEDULE_CHANGE" | "SCHEDULE_CHANGE_REASON_REQUIRED" | "SCHEDULE_CONFLICT" | "INTERNAL_ERROR" };

export type CleaningRequestScheduleHistoryItem = { id: string; previousScheduledStart: string | null; previousScheduledEnd: string | null; newScheduledStart: string; newScheduledEnd: string | null; reason: string | null; changedAt: string; changedBy: { id: string; name: string; email: string } };

function safeHistory(row: HistoryRow) {
  return { id: row.id, previousScheduledStart: row.previousScheduledStart?.toISOString() ?? null, previousScheduledEnd: row.previousScheduledEnd?.toISOString() ?? null, newScheduledStart: row.newScheduledStart.toISOString(), newScheduledEnd: row.newScheduledEnd?.toISOString() ?? null, reason: row.reason, createdAt: row.createdAt.toISOString() };
}

export async function setCleaningRequestConfirmedScheduleForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date } = {}): Promise<CleaningRequestScheduleResult> {
  const parsed = CleaningRequestConfirmedScheduleInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT" };
  const start = parseBusinessDateTime(parsed.data.date, parsed.data.appointmentTime);
  if ("error" in start) return { success: false, reason: "INVALID_LOCAL_TIME" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const now = options.now ?? new Date();
  if (start.date <= now) return { success: false, reason: "SCHEDULE_IN_PAST" };
  try {
    return await database.$transaction(async (transaction) => {
      const current = await transaction.cleaningRequest.findUnique({ where: { id: parsed.data.cleaningRequestId }, select: { id: true, requestNumber: true, status: true, scheduledStart: true, scheduledEnd: true } });
      if (!current) return { success: false, reason: "REQUEST_NOT_FOUND" };
      if (current.status !== CleaningRequestStatus.REVIEWING) return { success: false, reason: "INVALID_REQUEST_STATUS" };
      if (current.scheduledStart?.getTime() === start.date.getTime()) return { success: false, reason: "NO_SCHEDULE_CHANGE" };
      if (current.scheduledStart !== null && !parsed.data.reason) return { success: false, reason: "SCHEDULE_CHANGE_REASON_REQUIRED" };
      const updated = await transaction.cleaningRequest.updateMany({ where: { id: current.id, status: CleaningRequestStatus.REVIEWING, scheduledStart: current.scheduledStart, scheduledEnd: current.scheduledEnd }, data: { scheduledStart: start.date, scheduledEnd: null } });
      if (updated.count !== 1) return { success: false, reason: "SCHEDULE_CONFLICT" };
      const history = await transaction.cleaningRequestScheduleHistory.create({ data: { cleaningRequestId: current.id, previousScheduledStart: current.scheduledStart, previousScheduledEnd: current.scheduledEnd, newScheduledStart: start.date, newScheduledEnd: null, changedByAdminUserId: adminId, reason: parsed.data.reason ?? null, createdAt: now }, select: { id: true, previousScheduledStart: true, previousScheduledEnd: true, newScheduledStart: true, newScheduledEnd: true, reason: true, createdAt: true } });
      const safe = safeHistory(history);
      return { success: true, request: { id: current.id, requestNumber: current.requestNumber, status: current.status, scheduledStart: safe.newScheduledStart, scheduledEnd: null }, history: { ...safe, newScheduledEnd: null } };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { success: false, reason: "INTERNAL_ERROR" };
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

type HistoryDatabase = { cleaningRequestScheduleHistory: { findMany: (args: Record<string, unknown>) => Promise<Array<HistoryRow & { changedByAdminUser: { id: string; name: string; email: string } }>> } };

export async function getCleaningRequestScheduleHistory(requestId: string, options: { database?: HistoryDatabase } = {}): Promise<CleaningRequestScheduleHistoryItem[]> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as HistoryDatabase;
  const rows = await database.cleaningRequestScheduleHistory.findMany({ where: { cleaningRequestId: requestId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, previousScheduledStart: true, previousScheduledEnd: true, newScheduledStart: true, newScheduledEnd: true, reason: true, createdAt: true, changedByAdminUser: { select: { id: true, name: true, email: true } } } });
  return rows.map((row) => ({ id: row.id, previousScheduledStart: row.previousScheduledStart?.toISOString() ?? null, previousScheduledEnd: row.previousScheduledEnd?.toISOString() ?? null, newScheduledStart: row.newScheduledStart.toISOString(), newScheduledEnd: row.newScheduledEnd?.toISOString() ?? null, reason: row.reason, changedAt: row.createdAt.toISOString(), changedBy: row.changedByAdminUser }));
}
