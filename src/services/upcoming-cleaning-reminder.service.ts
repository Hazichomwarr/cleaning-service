import { Prisma, CleaningRequestStatus, NotificationStatus, NotificationType } from "../generated/prisma/client";
import { formatBusinessDateTimeRange } from "../lib/business-time";
import { renderUpcomingCleaningCustomerEmail, upcomingCleaningCustomerSubject } from "../emails/upcoming-cleaning-customer.email";
import { createEmailNotification, deliverNotification, type NotificationDatabase } from "./notification.service";
import type { EmailProvider } from "../lib/email/resend-email.provider";

const REMINDER_MINIMUM_HOURS = 23;
const REMINDER_MAXIMUM_HOURS = 25;
export const UPCOMING_REMINDER_BATCH_SIZE = 100;

type ReminderRequest = {
  id: string; requestNumber: string; status: CleaningRequestStatus; customerEmail: string | null; customerName: string | null;
  propertyType: import("../generated/prisma/client").PropertyType; confirmedPrice: Prisma.Decimal | null;
  scheduledStart: Date | null; scheduledEnd: Date | null; addressLine1: string; addressLine2: string | null;
  city: string; state: string; postalCode: string; service: { name: string } | null;
  requestExtras: Array<{ cleaningExtra: { name: string } }>;
};

type ReminderNotification = { id: string; status: NotificationStatus };
type ReminderDatabase = NotificationDatabase & {
  cleaningRequest: {
    findMany: (args: Record<string, unknown>) => Promise<ReminderRequest[]>;
    findUnique: (args: Record<string, unknown>) => Promise<ReminderRequest | null>;
  };
  $transaction: <T>(callback: (transaction: ReminderDatabase) => Promise<T>) => Promise<T>;
};

export type ReminderWindow = { start: Date; end: Date };
export function getUpcomingCleaningReminderWindow(now: Date): ReminderWindow {
  return { start: new Date(now.getTime() + REMINDER_MINIMUM_HOURS * 60 * 60 * 1000), end: new Date(now.getTime() + REMINDER_MAXIMUM_HOURS * 60 * 60 * 1000) };
}

export function isWithinUpcomingCleaningReminderWindow(value: Date, window: ReminderWindow): boolean {
  return value >= window.start && value < window.end;
}

export function upcomingCleaningDeduplicationKey(requestId: string, scheduledStart: Date, scheduledEnd: Date): string {
  return `upcoming-cleaning:${requestId}:${scheduledStart.toISOString()}:${scheduledEnd.toISOString()}`;
}

function usableEmail(value: string | null): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isEligible(request: ReminderRequest, window: ReminderWindow): boolean {
  return (request.status === CleaningRequestStatus.CONFIRMED || request.status === CleaningRequestStatus.ASSIGNED)
    && request.scheduledStart !== null && request.scheduledEnd !== null
    && request.scheduledEnd > request.scheduledStart
    && isWithinUpcomingCleaningReminderWindow(request.scheduledStart, window)
    && request.confirmedPrice !== null
    && usableEmail(request.customerEmail);
}

function reminderInput(request: ReminderRequest, deduplicationKey: string) {
  return {
    type: NotificationType.UPCOMING_CLEANING_CUSTOMER,
    recipientEmail: request.customerEmail!, recipientName: request.customerName,
    subject: upcomingCleaningCustomerSubject(request.requestNumber),
    html: renderUpcomingCleaningCustomerEmail({
      requestNumber: request.requestNumber, customerName: request.customerName, serviceName: request.service?.name ?? "Cleaning service",
      propertyType: request.propertyType, confirmedPrice: request.confirmedPrice!.toFixed(2),
      scheduledRange: formatBusinessDateTimeRange(request.scheduledStart!.toISOString(), request.scheduledEnd!.toISOString()),
      addressLine1: request.addressLine1, addressLine2: request.addressLine2, city: request.city, state: request.state, postalCode: request.postalCode,
      extraNames: request.requestExtras.map((item) => item.cleaningExtra.name),
    }), cleaningRequestId: request.id, deduplicationKey,
  };
}

export type UpcomingCleaningReminderSummary = { processed: true; scanned: number; created: number; existing: number; sent: number; failed: number; skipped: number };

export async function processUpcomingCleaningReminders(options: { database?: ReminderDatabase; now?: Date; emailProvider?: EmailProvider } = {}): Promise<UpcomingCleaningReminderSummary> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as ReminderDatabase;
  const now = options.now ?? new Date();
  const window = getUpcomingCleaningReminderWindow(now);
  const candidates = await database.cleaningRequest.findMany({
    where: { status: { in: [CleaningRequestStatus.CONFIRMED, CleaningRequestStatus.ASSIGNED] }, scheduledStart: { gte: window.start, lt: window.end } },
    orderBy: [{ scheduledStart: "asc" }, { id: "asc" }], take: UPCOMING_REMINDER_BATCH_SIZE,
    select: { id: true, requestNumber: true, status: true, customerEmail: true, customerName: true, propertyType: true, confirmedPrice: true, scheduledStart: true, scheduledEnd: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, service: { select: { name: true } }, requestExtras: { select: { cleaningExtra: { select: { name: true } } } } },
  });
  const summary: UpcomingCleaningReminderSummary = { processed: true, scanned: candidates.length, created: 0, existing: 0, sent: 0, failed: 0, skipped: 0 };

  for (const candidate of candidates) {
    let outcome: { kind: "created" | "existing" | "skipped" | "failed"; notification?: ReminderNotification };
    try {
      outcome = await database.$transaction(async (transaction) => {
        const current = await transaction.cleaningRequest.findUnique({ where: { id: candidate.id }, select: { id: true, requestNumber: true, status: true, customerEmail: true, customerName: true, propertyType: true, confirmedPrice: true, scheduledStart: true, scheduledEnd: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, service: { select: { name: true } }, requestExtras: { select: { cleaningExtra: { select: { name: true } } } } } });
        if (!current || !isEligible(current, window)) return { kind: "skipped" };
        const key = upcomingCleaningDeduplicationKey(current.id, current.scheduledStart!, current.scheduledEnd!);
        const existing = await transaction.notification.findUnique({ where: { deduplicationKey: key }, select: { id: true, status: true } });
        if (existing) return { kind: "existing", notification: existing };
        const created = await createEmailNotification(reminderInput(current, key), { database: transaction });
        if (created.success) return { kind: "created", notification: { id: created.notification.id, status: created.notification.status } };
        const raced = await transaction.notification.findUnique({ where: { deduplicationKey: key }, select: { id: true, status: true } });
        return raced ? { kind: "existing", notification: raced } : { kind: "failed" };
      });
    } catch {
      // A concurrent unique-key collision can abort the small transaction before
      // its winner is observable inside it. Re-read outside the failed transaction.
      const key = candidate.scheduledStart && candidate.scheduledEnd && candidate.scheduledEnd > candidate.scheduledStart
        ? upcomingCleaningDeduplicationKey(candidate.id, candidate.scheduledStart, candidate.scheduledEnd)
        : null;
      const raced = key ? await database.notification.findUnique({ where: { deduplicationKey: key }, select: { id: true, status: true } }) : null;
      outcome = raced ? { kind: "existing", notification: raced } : { kind: "failed" };
    }
    summary[outcome.kind] += 1;
    if (outcome.notification && (outcome.notification.status === NotificationStatus.PENDING || outcome.notification.status === NotificationStatus.FAILED)) {
      try {
        const delivery = await deliverNotification(outcome.notification.id, { database, emailProvider: options.emailProvider, now });
        if (delivery.status === "SENT") summary.sent += 1;
        if (delivery.status === "FAILED") summary.failed += 1;
      } catch { summary.failed += 1; }
    }
  }
  return summary;
}
