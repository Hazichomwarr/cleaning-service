import { CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { renderRequestAcceptedCustomerEmail, requestAcceptedCustomerSubject } from "../emails/request-accepted-customer.email";
import { renderRequestDeclinedCustomerEmail, requestDeclinedCustomerSubject } from "../emails/request-declined-customer.email";
import { canTransitionCleaningRequestStatus } from "../lib/cleaning-request-lifecycle";
import { CleaningRequestLifecycleInputSchema } from "../lib/validations/cleaning-request-lifecycle.schema";
import { createEmailNotification, deliverNotification, type NotificationDatabase } from "./notification.service";
import type { EmailProvider } from "../lib/email/resend-email.provider";

type RequestRow = { id: string; requestNumber: string; status: CleaningRequestStatus; customerEmail?: string | null; customerName?: string | null; propertyType?: import("../generated/prisma/client").PropertyType; preferredDate?: Date; preferredTimeWindow?: string; estimatedPrice?: Prisma.Decimal | null; estimateOutcome?: import("../generated/prisma/client").CleaningEstimateOutcome; service?: { name: string } | null };
type HistoryRow = { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: Date };
export type LifecycleTransaction = {
  cleaningRequest: { findUnique: (args: Record<string, unknown>) => Promise<RequestRow | null>; updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>; };
  cleaningRequestStatusHistory: { create: (args: Record<string, unknown>) => Promise<HistoryRow> };
  notification?: NotificationDatabase["notification"];
};
type Database = { $transaction: <T>(callback: (transaction: LifecycleTransaction) => Promise<T>) => Promise<T>; cleaningRequestStatusHistory: { findMany: (args: Record<string, unknown>) => Promise<Array<HistoryRow & { changedByAdminUser: { id: string; name: string; email: string } }>> }; notification?: NotificationDatabase["notification"] };

export type CleaningRequestLifecycleResult =
  | { success: true; request: { id: string; requestNumber: string; status: CleaningRequestStatus }; transition: { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: string } }
  | { success: false; reason: "INVALID_INPUT" | "REQUEST_NOT_FOUND" | "INVALID_TRANSITION" | "CANCELLATION_REASON_REQUIRED" | "STATUS_CONFLICT" | "INTERNAL_ERROR" };

export type CleaningRequestStatusHistoryItem = { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; changedAt: string; changedBy: { id: string; name: string; email: string } };

type LifecycleMutationResult = { result: CleaningRequestLifecycleResult; notificationId: string | null };

function safeHistory(row: HistoryRow): { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: string } { return { id: row.id, fromStatus: row.fromStatus, toStatus: row.toStatus, reason: row.reason, createdAt: row.createdAt.toISOString() }; }

export async function transitionCleaningRequestStatusInTransaction(adminId: string, transaction: LifecycleTransaction, current: RequestRow, toStatus: CleaningRequestStatus, reason: string | null, transitionTime: Date, options: { allowAssignmentRollback?: boolean } = {}): Promise<CleaningRequestLifecycleResult> {
  const fromStatus = current.status;
  if (!canTransitionCleaningRequestStatus(fromStatus, toStatus)) return { success: false, reason: "INVALID_TRANSITION" };
  if (fromStatus === CleaningRequestStatus.ASSIGNED && toStatus === CleaningRequestStatus.CONFIRMED && !options.allowAssignmentRollback) return { success: false, reason: "INVALID_TRANSITION" };
  if (toStatus === CleaningRequestStatus.CANCELLED && !reason) return { success: false, reason: "CANCELLATION_REASON_REQUIRED" };
  const updated = await transaction.cleaningRequest.updateMany({ where: { id: current.id, status: fromStatus }, data: toStatus === CleaningRequestStatus.CANCELLED ? { status: toStatus, cancelledAt: transitionTime, cancellationReason: reason } : { status: toStatus } });
  if (updated.count !== 1) return { success: false, reason: "STATUS_CONFLICT" };
  const history = await transaction.cleaningRequestStatusHistory.create({ data: { cleaningRequestId: current.id, fromStatus, toStatus, changedByAdminUserId: adminId, reason, createdAt: transitionTime }, select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true } });
  return { success: true, request: { id: current.id, requestNumber: current.requestNumber, status: toStatus }, transition: safeHistory(history) };
}

async function transitionCleaningRequestStatusWithNotification(adminId: string, input: unknown, options: { database?: Database; now?: Date } = {}): Promise<LifecycleMutationResult> {
  const parsed = CleaningRequestLifecycleInputSchema.safeParse(input);
  if (!parsed.success) return { result: { success: false, reason: "INVALID_INPUT" }, notificationId: null };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const transitionTime = options.now ?? new Date();
  try {
    return await database.$transaction(async (transaction) => {
      const current = await transaction.cleaningRequest.findUnique({ where: { id: parsed.data.cleaningRequestId }, select: { id: true, requestNumber: true, status: true, customerEmail: true, customerName: true, propertyType: true, preferredDate: true, preferredTimeWindow: true, estimatedPrice: true, estimateOutcome: true, service: { select: { name: true } } } });
      if (!current) return { result: { success: false, reason: "REQUEST_NOT_FOUND" }, notificationId: null };
      const transition = await transitionCleaningRequestStatusInTransaction(adminId, transaction, current, parsed.data.toStatus, parsed.data.reason, transitionTime);
      if (!transition.success || current.status !== CleaningRequestStatus.NEW || (parsed.data.toStatus !== CleaningRequestStatus.REVIEWING && parsed.data.toStatus !== CleaningRequestStatus.CANCELLED)) return { result: transition, notificationId: null };
      if (!current.customerEmail || !/^\S+@\S+\.\S+$/.test(current.customerEmail.trim())) {
        console.error("[notification] customer recipient unavailable", { requestId: current.id, type: acceptedNotificationType(parsed.data.toStatus) });
        return { result: transition, notificationId: null };
      }
      if (!transaction.notification) throw new Error("Notification transaction boundary is unavailable.");
      const accepted = parsed.data.toStatus === CleaningRequestStatus.REVIEWING;
      const notification = await createEmailNotification({
        type: accepted ? "REQUEST_ACCEPTED_CUSTOMER" : "REQUEST_DECLINED_CUSTOMER",
        recipientEmail: current.customerEmail,
        recipientName: current.customerName,
        subject: accepted ? requestAcceptedCustomerSubject(current.requestNumber) : requestDeclinedCustomerSubject(current.requestNumber),
        html: accepted
          ? renderRequestAcceptedCustomerEmail({ requestNumber: current.requestNumber, customerName: current.customerName ?? null, serviceName: current.service?.name ?? "Cleaning service", propertyType: current.propertyType!, preferredDate: current.preferredDate?.toISOString().slice(0, 10) ?? "Not provided", preferredTimeWindow: current.preferredTimeWindow ?? "Not provided", estimateOutcome: current.estimateOutcome!, estimatedPrice: current.estimatedPrice?.toFixed(2) ?? null })
          : renderRequestDeclinedCustomerEmail({ requestNumber: current.requestNumber, customerName: current.customerName ?? null, reason: parsed.data.reason! }),
        cleaningRequestId: current.id,
      }, { database: transaction as unknown as NotificationDatabase });
      if (!notification.success) throw new Error("Unable to persist customer lifecycle notification intent.");
      return { result: transition, notificationId: notification.notification.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { result: { success: false, reason: "INTERNAL_ERROR" }, notificationId: null };
    return { result: { success: false, reason: "INTERNAL_ERROR" }, notificationId: null };
  }
}

function acceptedNotificationType(toStatus: CleaningRequestStatus): "REQUEST_ACCEPTED_CUSTOMER" | "REQUEST_DECLINED_CUSTOMER" {
  return toStatus === CleaningRequestStatus.REVIEWING ? "REQUEST_ACCEPTED_CUSTOMER" : "REQUEST_DECLINED_CUSTOMER";
}

export async function transitionCleaningRequestStatusForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date; emailProvider?: EmailProvider } = {}): Promise<CleaningRequestLifecycleResult> {
  const mutation = await transitionCleaningRequestStatusWithNotification(adminId, input, options);
  if (mutation.notificationId) {
    try {
      await deliverNotification(mutation.notificationId, { database: (options.database ?? (await import("../lib/db/prisma")).prisma) as unknown as NotificationDatabase, emailProvider: options.emailProvider });
    } catch {
      console.error("[notification] customer lifecycle delivery failed unexpectedly", { notificationId: mutation.notificationId });
    }
  }
  return mutation.result;
}

export async function getCleaningRequestStatusHistory(requestId: string, options: { database?: Database } = {}): Promise<CleaningRequestStatusHistoryItem[]> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const rows = await database.cleaningRequestStatusHistory.findMany({ where: { cleaningRequestId: requestId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, changedByAdminUser: { select: { id: true, name: true, email: true } } } });
  return rows.map((row) => ({ id: row.id, fromStatus: row.fromStatus, toStatus: row.toStatus, reason: row.reason, changedAt: row.createdAt.toISOString(), changedBy: row.changedByAdminUser }));
}
