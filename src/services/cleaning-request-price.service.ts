import { CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { CleaningRequestConfirmedPriceInputSchema } from "../lib/validations/cleaning-request-price.schema";

type RequestRow = { id: string; requestNumber: string; status: CleaningRequestStatus; confirmedPrice: Prisma.Decimal | null };
type HistoryRow = { id: string; previousConfirmedPrice: Prisma.Decimal | null; newConfirmedPrice: Prisma.Decimal; reason: string | null; createdAt: Date };
type Transaction = {
  cleaningRequest: {
    findUnique: (args: Record<string, unknown>) => Promise<RequestRow | null>;
    updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  };
  cleaningRequestPriceHistory: { create: (args: Record<string, unknown>) => Promise<HistoryRow> };
};
type Database = { $transaction: <T>(callback: (transaction: Transaction) => Promise<T>) => Promise<T> };

export type CleaningRequestPriceResult =
  | { success: true; request: { id: string; requestNumber: string; status: CleaningRequestStatus; confirmedPrice: string }; history: { id: string; previousConfirmedPrice: string | null; newConfirmedPrice: string; reason: string | null; createdAt: string } }
  | { success: false; reason: "INVALID_INPUT" | "REQUEST_NOT_FOUND" | "INVALID_REQUEST_STATUS" | "NO_PRICE_CHANGE" | "PRICE_CHANGE_REASON_REQUIRED" | "STATUS_CONFLICT" | "INTERNAL_ERROR" };

export type CleaningRequestPriceHistoryItem = { id: string; previousConfirmedPrice: string | null; newConfirmedPrice: string; reason: string | null; changedAt: string; changedBy: { id: string; name: string; email: string } };

function decimalToMoney(value: Prisma.Decimal): string { return value.toFixed(2); }
function parseMoney(value: string): Prisma.Decimal | null {
  try {
    const decimal = new Prisma.Decimal(value);
    return decimal.gt(0) && decimal.decimalPlaces() <= 2 ? decimal : null;
  } catch {
    return null;
  }
}

function safeHistory(row: HistoryRow) {
  return { id: row.id, previousConfirmedPrice: row.previousConfirmedPrice ? decimalToMoney(row.previousConfirmedPrice) : null, newConfirmedPrice: decimalToMoney(row.newConfirmedPrice), reason: row.reason, createdAt: row.createdAt.toISOString() };
}

export async function setCleaningRequestConfirmedPriceForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date } = {}): Promise<CleaningRequestPriceResult> {
  const parsed = CleaningRequestConfirmedPriceInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT" };
  const newPrice = parseMoney(parsed.data.confirmedPrice);
  if (!newPrice) return { success: false, reason: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const transitionTime = options.now ?? new Date();
  try {
    return await database.$transaction(async (transaction) => {
      const current = await transaction.cleaningRequest.findUnique({ where: { id: parsed.data.cleaningRequestId }, select: { id: true, requestNumber: true, status: true, confirmedPrice: true } });
      if (!current) return { success: false, reason: "REQUEST_NOT_FOUND" };
      if (current.status !== CleaningRequestStatus.REVIEWING) return { success: false, reason: "INVALID_REQUEST_STATUS" };
      if (current.confirmedPrice?.eq(newPrice) ?? false) return { success: false, reason: "NO_PRICE_CHANGE" };
      if (current.confirmedPrice !== null && !parsed.data.reason) return { success: false, reason: "PRICE_CHANGE_REASON_REQUIRED" };
      const updated = await transaction.cleaningRequest.updateMany({ where: { id: current.id, status: CleaningRequestStatus.REVIEWING, confirmedPrice: current.confirmedPrice }, data: { confirmedPrice: newPrice } });
      if (updated.count !== 1) return { success: false, reason: "STATUS_CONFLICT" };
      const history = await transaction.cleaningRequestPriceHistory.create({ data: { cleaningRequestId: current.id, previousConfirmedPrice: current.confirmedPrice, newConfirmedPrice: newPrice, changedByAdminUserId: adminId, reason: parsed.data.reason ?? null, createdAt: transitionTime }, select: { id: true, previousConfirmedPrice: true, newConfirmedPrice: true, reason: true, createdAt: true } });
      return { success: true, request: { id: current.id, requestNumber: current.requestNumber, status: current.status, confirmedPrice: decimalToMoney(newPrice) }, history: safeHistory(history) };
    });
  } catch {
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

type HistoryDatabase = { cleaningRequestPriceHistory: { findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string; previousConfirmedPrice: Prisma.Decimal | null; newConfirmedPrice: Prisma.Decimal; reason: string | null; createdAt: Date; changedByAdminUser: { id: string; name: string; email: string } }>> } };

export async function getCleaningRequestPriceHistory(requestId: string, options: { database?: HistoryDatabase } = {}): Promise<CleaningRequestPriceHistoryItem[]> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as HistoryDatabase;
  const rows = await database.cleaningRequestPriceHistory.findMany({ where: { cleaningRequestId: requestId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, previousConfirmedPrice: true, newConfirmedPrice: true, reason: true, createdAt: true, changedByAdminUser: { select: { id: true, name: true, email: true } } } });
  return rows.map((row) => ({ id: row.id, previousConfirmedPrice: row.previousConfirmedPrice ? decimalToMoney(row.previousConfirmedPrice) : null, newConfirmedPrice: decimalToMoney(row.newConfirmedPrice), reason: row.reason, changedAt: row.createdAt.toISOString(), changedBy: row.changedByAdminUser }));
}
