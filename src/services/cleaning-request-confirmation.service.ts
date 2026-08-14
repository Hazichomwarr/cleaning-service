import { CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { renderRequestConfirmedCustomerEmail, requestConfirmedCustomerSubject } from "../emails/request-confirmed-customer.email";
import { formatBusinessDateTimeRange } from "../lib/business-time";
import { getCleaningRequestConfirmationReadiness, type ConfirmationInvalidRequirement, type ConfirmationMissingRequirement } from "../lib/cleaning-request-confirmation";
import { CleaningRequestConfirmationInputSchema } from "../lib/validations/cleaning-request-confirmation.schema";
import { transitionCleaningRequestStatusInTransaction, type LifecycleTransaction } from "./cleaning-request-lifecycle.service";
import { createEmailNotification, deliverNotification, type NotificationDatabase } from "./notification.service";
import type { EmailProvider } from "../lib/email/resend-email.provider";

type CurrentRequest = { id: string; requestNumber: string; status: CleaningRequestStatus; confirmedPrice: Prisma.Decimal | null; scheduledStart: Date | null; scheduledEnd: Date | null; customerEmail?: string | null; customerName?: string | null; propertyType?: import("../generated/prisma/client").PropertyType; bedrooms?: number | null; bathrooms?: Prisma.Decimal | null; addressLine1?: string; addressLine2?: string | null; city?: string; state?: string; postalCode?: string; service?: { name: string } | null; requestExtras?: Array<{ cleaningExtra: { name: string } }> };
type ConfirmationTransaction = Omit<LifecycleTransaction, "cleaningRequest"> & { cleaningRequest: { findUnique: (args: Record<string, unknown>) => Promise<CurrentRequest | null>; updateMany: LifecycleTransaction["cleaningRequest"]["updateMany"] } };
type Database = { $transaction: <T>(callback: (transaction: ConfirmationTransaction) => Promise<T>) => Promise<T>; notification?: NotificationDatabase["notification"] };
type ConfirmationMutationResult = { result: CleaningRequestConfirmationResult; notificationId: string | null };

export type CleaningRequestConfirmationResult =
  | { success: true; request: { id: string; requestNumber: string; status: CleaningRequestStatus }; transition: { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: string } }
  | { success: false; reason: "INVALID_INPUT" | "REQUEST_NOT_FOUND" | "INVALID_REQUEST_STATUS" | "CONFIRMATION_NOT_READY" | "STATUS_CONFLICT" | "INTERNAL_ERROR"; missing?: ConfirmationMissingRequirement[]; invalid?: ConfirmationInvalidRequirement[] };

export async function confirmCleaningRequestForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date; emailProvider?: EmailProvider } = {}): Promise<CleaningRequestConfirmationResult> {
  const parsed = CleaningRequestConfirmationInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const now = options.now ?? new Date();
  try {
    const result = await database.$transaction<ConfirmationMutationResult>(async (transaction) => {
      const current = await transaction.cleaningRequest.findUnique({ where: { id: parsed.data.cleaningRequestId }, select: { id: true, requestNumber: true, status: true, confirmedPrice: true, scheduledStart: true, scheduledEnd: true, customerEmail: true, customerName: true, propertyType: true, bedrooms: true, bathrooms: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, service: { select: { name: true } }, requestExtras: { select: { cleaningExtra: { select: { name: true } } } } } });
      if (!current) return { result: { success: false, reason: "REQUEST_NOT_FOUND" as const }, notificationId: null };
      if (current.status !== CleaningRequestStatus.REVIEWING) return { result: { success: false, reason: "INVALID_REQUEST_STATUS" as const }, notificationId: null };
      const readiness = getCleaningRequestConfirmationReadiness(current);
      if (!readiness.ready) return { result: { success: false, reason: "CONFIRMATION_NOT_READY" as const, missing: readiness.missing, invalid: readiness.invalid }, notificationId: null };
      const result = await transitionCleaningRequestStatusInTransaction(adminId, transaction as unknown as LifecycleTransaction, current, CleaningRequestStatus.CONFIRMED, null, now);
      if (!result.success) return { result: result.reason === "STATUS_CONFLICT" ? { success: false, reason: "STATUS_CONFLICT" as const } : { success: false, reason: "INTERNAL_ERROR" as const }, notificationId: null };
      if (current.customerEmail && /^\S+@\S+\.\S+$/.test(current.customerEmail.trim())) {
        if (!transaction.notification) throw new Error("Notification transaction boundary is unavailable.");
        const notification = await createEmailNotification({
          type: "REQUEST_CONFIRMED_CUSTOMER",
          recipientEmail: current.customerEmail,
          recipientName: current.customerName,
          subject: requestConfirmedCustomerSubject(current.requestNumber),
          html: renderRequestConfirmedCustomerEmail({ requestNumber: current.requestNumber, customerName: current.customerName ?? null, serviceName: current.service?.name ?? "Cleaning service", propertyType: current.propertyType!, bedrooms: current.bedrooms ?? null, bathrooms: current.bathrooms?.toString() ?? null, confirmedPrice: current.confirmedPrice!.toFixed(2), scheduledRange: formatBusinessDateTimeRange(current.scheduledStart?.toISOString() ?? null, current.scheduledEnd?.toISOString() ?? null), addressLine1: current.addressLine1 ?? "Not provided", addressLine2: current.addressLine2 ?? null, city: current.city ?? "Not provided", state: current.state ?? "", postalCode: current.postalCode ?? "", extraNames: current.requestExtras?.map((item) => item.cleaningExtra.name) ?? [] }),
          cleaningRequestId: current.id,
        }, { database: transaction as unknown as NotificationDatabase });
        if (!notification.success) throw new Error("Unable to persist confirmation notification intent.");
        return { result, notificationId: notification.notification.id };
      }
      if (!current.customerEmail || !/^\S+@\S+\.\S+$/.test(current.customerEmail.trim())) console.error("[notification] customer recipient unavailable", { requestId: current.id, type: "REQUEST_CONFIRMED_CUSTOMER" });
      return { result, notificationId: null };
    });
    if ("result" in result) {
      if (result.notificationId) {
        try { await deliverNotification(result.notificationId, { database: (database as unknown as NotificationDatabase), emailProvider: options.emailProvider }); } catch { console.error("[notification] confirmation delivery failed unexpectedly", { notificationId: result.notificationId }); }
      }
      return result.result;
    }
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { success: false, reason: "INTERNAL_ERROR" };
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}
