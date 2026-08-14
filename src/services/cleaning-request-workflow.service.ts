import { CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { renderCleaningStartedCustomerEmail, cleaningStartedCustomerSubject } from "../emails/cleaning-started-customer.email";
import { renderCleaningCompletedCustomerEmail, cleaningCompletedCustomerSubject } from "../emails/cleaning-completed-customer.email";
import { getCleaningRequestWorkflowReadiness } from "../lib/cleaning-request-workflow";
import { CleaningRequestWorkflowInputSchema } from "../lib/validations/cleaning-request-workflow.schema";
import { createEmailNotification, deliverNotification, type NotificationDatabase } from "./notification.service";
import { transitionCleaningRequestStatusInTransaction, type LifecycleTransaction } from "./cleaning-request-lifecycle.service";
import type { EmailProvider } from "../lib/email/resend-email.provider";

type CurrentRequest = {
  id: string; requestNumber: string; status: CleaningRequestStatus; confirmedPrice: Prisma.Decimal | null;
  scheduledStart: Date | null; scheduledEnd: Date | null; assignments: Array<{ id: string }>;
  customerEmail?: string | null; customerName?: string | null; addressLine1?: string; addressLine2?: string | null;
  city?: string; state?: string; postalCode?: string; service?: { name: string } | null;
};

type WorkflowTransaction = Omit<LifecycleTransaction, "cleaningRequest"> & {
  cleaningRequest: { findUnique: (args: Record<string, unknown>) => Promise<CurrentRequest | null>; updateMany: LifecycleTransaction["cleaningRequest"]["updateMany"] };
};

type Database = {
  $transaction: <T>(callback: (transaction: WorkflowTransaction) => Promise<T>) => Promise<T>;
  notification?: NotificationDatabase["notification"];
};

export type CleaningRequestWorkflowResult =
  | { success: true; request: { id: string; requestNumber: string; status: CleaningRequestStatus }; transition: { id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: string } }
  | { success: false; reason: "INVALID_INPUT" | "REQUEST_NOT_FOUND" | "INVALID_REQUEST_STATUS" | "NO_ASSIGNED_WORKERS" | "REQUEST_NOT_OPERATIONALLY_READY" | "STATUS_CONFLICT" | "INTERNAL_ERROR" };

type WorkflowMutationResult = { result: CleaningRequestWorkflowResult; notificationId: string | null };

function hasUsableEmail(value: string | null | undefined): value is string {
  return Boolean(value && /^\S+@\S+\.\S+$/.test(value.trim()));
}

function notificationForTransition(current: CurrentRequest, toStatus: CleaningRequestStatus) {
  const started = toStatus === CleaningRequestStatus.IN_PROGRESS;
  const data = {
    requestNumber: current.requestNumber, customerName: current.customerName ?? null, serviceName: current.service?.name ?? "Cleaning service",
    confirmedPrice: current.confirmedPrice?.toFixed(2) ?? "Not provided", addressLine1: current.addressLine1 ?? "Not provided", addressLine2: current.addressLine2 ?? null,
    city: current.city ?? "Not provided", state: current.state ?? "", postalCode: current.postalCode ?? "",
  };
  return {
    type: started ? "CLEANING_STARTED_CUSTOMER" as const : "CLEANING_COMPLETED_CUSTOMER" as const,
    subject: started ? cleaningStartedCustomerSubject(current.requestNumber) : cleaningCompletedCustomerSubject(current.requestNumber),
    html: started ? renderCleaningStartedCustomerEmail(data) : renderCleaningCompletedCustomerEmail(data),
  };
}

async function transition(adminId: string, input: unknown, fromStatus: CleaningRequestStatus, toStatus: CleaningRequestStatus, options: { database?: Database; now?: Date; emailProvider?: EmailProvider } = {}): Promise<CleaningRequestWorkflowResult> {
  const parsed = CleaningRequestWorkflowInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const transitionTime = options.now ?? new Date();
  let mutation: WorkflowMutationResult;
  try {
    mutation = await database.$transaction(async (transaction) => {
      const current = await transaction.cleaningRequest.findUnique({
        where: { id: parsed.data.cleaningRequestId },
        select: { id: true, requestNumber: true, status: true, confirmedPrice: true, scheduledStart: true, scheduledEnd: true, customerEmail: true, customerName: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, assignments: { select: { id: true } }, service: { select: { name: true } } },
      });
      if (!current) return { result: { success: false, reason: "REQUEST_NOT_FOUND" as const }, notificationId: null };
      if (current.status !== fromStatus) return { result: { success: false, reason: "INVALID_REQUEST_STATUS" as const }, notificationId: null };
      const readiness = getCleaningRequestWorkflowReadiness({ ...current, assignmentCount: current.assignments.length });
      if (fromStatus === CleaningRequestStatus.ASSIGNED && readiness.startBlockingReasons.includes("NO_ASSIGNED_WORKERS")) return { result: { success: false, reason: "NO_ASSIGNED_WORKERS" as const }, notificationId: null };
      if (fromStatus === CleaningRequestStatus.ASSIGNED && readiness.startBlockingReasons.some((reason) => reason !== "NO_ASSIGNED_WORKERS")) return { result: { success: false, reason: "REQUEST_NOT_OPERATIONALLY_READY" as const }, notificationId: null };
      if (fromStatus === CleaningRequestStatus.IN_PROGRESS && readiness.completeBlockingReasons.includes("NO_ASSIGNED_WORKERS")) return { result: { success: false, reason: "NO_ASSIGNED_WORKERS" as const }, notificationId: null };

      const result = await transitionCleaningRequestStatusInTransaction(adminId, transaction as unknown as LifecycleTransaction, current, toStatus, null, transitionTime);
      if (!result.success) return { result: result.reason === "STATUS_CONFLICT" ? { success: false, reason: "STATUS_CONFLICT" as const } : { success: false, reason: "INTERNAL_ERROR" as const }, notificationId: null };
      if (!hasUsableEmail(current.customerEmail)) {
        console.error("[notification] customer recipient unavailable", { requestId: current.id, type: notificationForTransition(current, toStatus).type });
        return { result, notificationId: null };
      }
      if (!transaction.notification) throw new Error("Notification transaction boundary is unavailable.");
      const notification = notificationForTransition(current, toStatus);
      const created = await createEmailNotification({ ...notification, recipientEmail: current.customerEmail, recipientName: current.customerName, cleaningRequestId: current.id }, { database: transaction as unknown as NotificationDatabase });
      if (!created.success) throw new Error("Unable to persist cleaning workflow notification intent.");
      return { result, notificationId: created.notification.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { success: false, reason: "INTERNAL_ERROR" };
    return { success: false, reason: "INTERNAL_ERROR" };
  }

  if (mutation.notificationId) {
    try {
      await deliverNotification(mutation.notificationId, { database: (database as unknown as NotificationDatabase), emailProvider: options.emailProvider });
    } catch {
      console.error("[notification] cleaning workflow delivery failed unexpectedly", { notificationId: mutation.notificationId });
    }
  }
  return mutation.result;
}

export function startCleaningForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date; emailProvider?: EmailProvider } = {}) {
  return transition(adminId, input, CleaningRequestStatus.ASSIGNED, CleaningRequestStatus.IN_PROGRESS, options);
}

export function completeCleaningForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date; emailProvider?: EmailProvider } = {}) {
  return transition(adminId, input, CleaningRequestStatus.IN_PROGRESS, CleaningRequestStatus.COMPLETED, options);
}
