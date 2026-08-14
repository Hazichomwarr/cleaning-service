import { NotificationChannel, NotificationStatus, Prisma } from "../generated/prisma/client";
import {
  CreateEmailNotificationSchema,
  type CreateEmailNotificationInput,
} from "../lib/validations/notification.schema";
import {
  createResendEmailProvider,
  type EmailDeliveryErrorCode,
  type EmailProvider,
} from "../lib/email/resend-email.provider";

type NotificationRow = {
  id: string;
  type: CreateEmailNotificationInput["type"];
  channel: NotificationChannel;
  status: NotificationStatus;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  content: string;
  attemptCount: number;
  providerMessageId: string | null;
};

export type NotificationDatabase = {
  notification: {
    create: (args: { data: Record<string, unknown>; select?: Record<string, boolean> }) => Promise<NotificationRow>;
    findUnique: (args: { where: { id: string }; select?: Record<string, boolean> }) => Promise<NotificationRow | null>;
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
  };
};

type DeliveryResult =
  | { status: "SENT"; notificationId: string; providerMessageId: string }
  | { status: "FAILED"; notificationId: string; errorCode: EmailDeliveryErrorCode }
  | { status: "NOT_FOUND" }
  | { status: "ALREADY_SENT"; notificationId: string }
  | { status: "DELIVERY_IN_PROGRESS"; notificationId: string }
  | { status: "DELIVERY_CONFLICT"; notificationId: string };

const notificationSelect = {
  id: true, type: true, channel: true, status: true, recipientEmail: true, recipientName: true,
  subject: true, content: true, attemptCount: true, providerMessageId: true,
};

export type NotificationCreationResult =
  | { success: true; notification: NotificationRow }
  | { success: false; reason: "INVALID_INPUT" | "INTERNAL_ERROR" };

export async function createEmailNotification(
  input: unknown,
  options: { database?: NotificationDatabase } = {},
): Promise<NotificationCreationResult> {
  const parsed = CreateEmailNotificationSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as NotificationDatabase;

  try {
    const notification = await database.notification.create({
      data: {
        type: parsed.data.type,
        channel: "EMAIL",
        status: NotificationStatus.PENDING,
        recipientEmail: parsed.data.recipientEmail,
        recipientName: parsed.data.recipientName ?? null,
        subject: parsed.data.subject,
        content: parsed.data.html,
        cleaningRequestId: parsed.data.cleaningRequestId,
      },
      select: notificationSelect,
    });
    return { success: true, notification };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { success: false, reason: "INTERNAL_ERROR" };
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

export async function deliverNotification(
  notificationId: string,
  options: { database?: NotificationDatabase; emailProvider?: EmailProvider; now?: Date } = {},
): Promise<DeliveryResult> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as NotificationDatabase;
  const current = await database.notification.findUnique({ where: { id: notificationId }, select: notificationSelect });
  if (!current) return { status: "NOT_FOUND" };
  if (current.status === NotificationStatus.SENT) return { status: "ALREADY_SENT", notificationId };
  if (current.status === NotificationStatus.SENDING) return { status: "DELIVERY_IN_PROGRESS", notificationId };
  if (current.status !== NotificationStatus.PENDING && current.status !== NotificationStatus.FAILED) {
    return { status: "DELIVERY_CONFLICT", notificationId };
  }

  const now = options.now ?? new Date();
  const claimed = await database.notification.updateMany({
    where: { id: notificationId, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } },
    data: { status: NotificationStatus.SENDING, attemptCount: { increment: 1 }, lastAttemptAt: now },
  });
  if (claimed.count !== 1) {
    const latest = await database.notification.findUnique({ where: { id: notificationId }, select: notificationSelect });
    return latest?.status === NotificationStatus.SENT
      ? { status: "ALREADY_SENT", notificationId }
      : { status: "DELIVERY_IN_PROGRESS", notificationId };
  }

  const provider = options.emailProvider ?? createResendEmailProvider();
  let result: Awaited<ReturnType<EmailProvider["sendEmail"]>>;
  try {
    result = await provider.sendEmail({
      to: current.recipientEmail,
      subject: current.subject,
      html: current.content,
      idempotencyKey: `notification/${notificationId}`,
    });
  } catch {
    result = { success: false, errorCode: "UNKNOWN_DELIVERY_ERROR" };
  }
  if (result.success) {
    const saved = await database.notification.updateMany({
      where: { id: notificationId, status: NotificationStatus.SENDING },
      data: { status: NotificationStatus.SENT, providerMessageId: result.providerMessageId, sentAt: now, lastErrorCode: null },
    });
    return saved.count === 1 ? { status: "SENT", notificationId, providerMessageId: result.providerMessageId } : { status: "DELIVERY_CONFLICT", notificationId };
  }

  const saved = await database.notification.updateMany({
    where: { id: notificationId, status: NotificationStatus.SENDING },
    data: { status: NotificationStatus.FAILED, lastFailedAt: now, lastErrorCode: result.errorCode },
  });
  return saved.count === 1 ? { status: "FAILED", notificationId, errorCode: result.errorCode } : { status: "DELIVERY_CONFLICT", notificationId };
}
