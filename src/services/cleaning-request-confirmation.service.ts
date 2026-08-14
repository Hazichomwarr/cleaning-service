import { CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { getCleaningRequestConfirmationReadiness, type ConfirmationInvalidRequirement, type ConfirmationMissingRequirement } from "../lib/cleaning-request-confirmation";
import { CleaningRequestConfirmationInputSchema } from "../lib/validations/cleaning-request-confirmation.schema";
import { transitionCleaningRequestStatusInTransaction, type LifecycleTransaction } from "./cleaning-request-lifecycle.service";

type CurrentRequest = { id: string; requestNumber: string; status: CleaningRequestStatus; confirmedPrice: Prisma.Decimal | null; scheduledStart: Date | null; scheduledEnd: Date | null };
type ConfirmationTransaction = Omit<LifecycleTransaction, "cleaningRequest"> & { cleaningRequest: { findUnique: (args: Record<string, unknown>) => Promise<CurrentRequest | null>; updateMany: LifecycleTransaction["cleaningRequest"]["updateMany"] } };
type Database = { $transaction: <T>(callback: (transaction: ConfirmationTransaction) => Promise<T>) => Promise<T> };

export type CleaningRequestConfirmationResult =
  | { success: true; request: { id: string; requestNumber: string; status: CleaningRequestStatus }; transition: { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: string } }
  | { success: false; reason: "INVALID_INPUT" | "REQUEST_NOT_FOUND" | "INVALID_REQUEST_STATUS" | "CONFIRMATION_NOT_READY" | "STATUS_CONFLICT" | "INTERNAL_ERROR"; missing?: ConfirmationMissingRequirement[]; invalid?: ConfirmationInvalidRequirement[] };

export async function confirmCleaningRequestForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date } = {}): Promise<CleaningRequestConfirmationResult> {
  const parsed = CleaningRequestConfirmationInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const now = options.now ?? new Date();
  try {
    return await database.$transaction(async (transaction) => {
      const current = await transaction.cleaningRequest.findUnique({ where: { id: parsed.data.cleaningRequestId }, select: { id: true, requestNumber: true, status: true, confirmedPrice: true, scheduledStart: true, scheduledEnd: true } });
      if (!current) return { success: false, reason: "REQUEST_NOT_FOUND" };
      if (current.status !== CleaningRequestStatus.REVIEWING) return { success: false, reason: "INVALID_REQUEST_STATUS" };
      const readiness = getCleaningRequestConfirmationReadiness(current);
      if (!readiness.ready) return { success: false, reason: "CONFIRMATION_NOT_READY", missing: readiness.missing, invalid: readiness.invalid };
      const result = await transitionCleaningRequestStatusInTransaction(adminId, transaction as unknown as LifecycleTransaction, current, CleaningRequestStatus.CONFIRMED, null, now);
      if (result.success) return result;
      return result.reason === "STATUS_CONFLICT" ? { success: false, reason: "STATUS_CONFLICT" as const } : { success: false, reason: "INTERNAL_ERROR" as const };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { success: false, reason: "INTERNAL_ERROR" };
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}
