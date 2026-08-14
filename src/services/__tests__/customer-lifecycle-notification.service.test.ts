import assert from "node:assert/strict";
import test from "node:test";
import { CleaningRequestStatus, NotificationStatus, Prisma } from "../../generated/prisma/client";
import { transitionCleaningRequestStatusForAdmin } from "../cleaning-request-lifecycle.service";

type Notice = { id: string; type: string; channel: string; status: NotificationStatus; recipientEmail: string; recipientName: string | null; subject: string; content: string; attemptCount: number; providerMessageId: string | null };

function database(overrides: { email?: string | null; failNotification?: boolean; conflict?: boolean } = {}) {
  const state: { id: string; requestNumber: string; status: CleaningRequestStatus; cancelledAt: Date | null; cancellationReason: string | null } = { id: "request-1", requestNumber: "JC-2026-0001", status: CleaningRequestStatus.NEW, cancelledAt: null, cancellationReason: null };
  const history: Array<{ id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: Date }> = [];
  const notifications: Notice[] = [];
  const row = { ...state, customerEmail: overrides.email ?? "old@example.com", customerName: "Jane <customer>", propertyType: "HOUSE" as const, preferredDate: new Date("2026-08-18T00:00:00Z"), preferredTimeWindow: "MORNING", estimatedPrice: new Prisma.Decimal("200.00"), estimateOutcome: "AUTOMATIC_ESTIMATE" as const, service: { name: "Deep Cleaning" } };
  const notification = {
    async create({ data }: { data: Record<string, unknown> }) {
      if (overrides.failNotification) throw new Error("notification failure");
      const notice: Notice = { id: `notification-${notifications.length + 1}`, type: String(data.type), channel: String(data.channel), status: data.status as NotificationStatus, recipientEmail: String(data.recipientEmail), recipientName: (data.recipientName as string | null) ?? null, subject: String(data.subject), content: String(data.content), attemptCount: 0, providerMessageId: null };
      notifications.push(notice);
      return notice;
    },
    async findUnique({ where }: { where: { id: string } }) { return notifications.find((notice) => notice.id === where.id) ?? null; },
    async updateMany({ where, data }: { where: { id: string; status?: { in: NotificationStatus[] } | NotificationStatus }; data: Record<string, unknown> }) {
      const notice = notifications.find((item) => item.id === where.id);
      const allowed = typeof where.status === "object" ? where.status.in.includes(notice?.status as NotificationStatus) : notice?.status === where.status;
      if (!notice || !allowed) return { count: 0 };
      if (overrides.conflict && data.status === NotificationStatus.SENDING) return { count: 0 };
      if (data.status) notice.status = data.status as NotificationStatus;
      if (data.providerMessageId) notice.providerMessageId = String(data.providerMessageId);
      if (data.attemptCount && typeof data.attemptCount === "object" && "increment" in data.attemptCount) notice.attemptCount += Number(data.attemptCount.increment);
      return { count: 1 };
    },
  };
  const db = {
    state, history, notifications, notification,
    async $transaction<T>(callback: (transaction: never) => Promise<T>) {
      const before = { ...state }; const historyLength = history.length; const notificationLength = notifications.length;
      try {
        return await callback({
          cleaningRequest: {
            async findUnique() { return { ...row, status: state.status }; },
            async updateMany({ data }: { data: Record<string, unknown> }) {
              if (overrides.conflict) return { count: 0 };
              state.status = data.status as CleaningRequestStatus;
              state.cancelledAt = (data.cancelledAt as Date | undefined) ?? null;
              state.cancellationReason = (data.cancellationReason as string | undefined) ?? null;
              return { count: 1 };
            },
          },
          cleaningRequestStatusHistory: {
            async create({ data }: { data: Record<string, unknown> }) {
              const item = { id: `history-${history.length + 1}`, fromStatus: data.fromStatus as CleaningRequestStatus, toStatus: data.toStatus as CleaningRequestStatus, reason: data.reason as string | null, createdAt: data.createdAt as Date };
              history.push(item); return item;
            },
          },
          notification,
        } as never);
      } catch (error) {
        Object.assign(state, before); history.splice(historyLength); notifications.splice(notificationLength); throw error;
      }
    },
  };
  return db;
}

test("accept creates exactly one customer notification atomically and delivers after commit", async () => {
  const db = database();
  const provider = { async sendEmail(input: { to: string; idempotencyKey: string }) { assert.equal(input.to, "old@example.com"); assert.equal(input.idempotencyKey, "notification/notification-1"); return { success: true as const, providerMessageId: "re_accept" }; } };
  const result = await transitionCleaningRequestStatusForAdmin("admin-1", { cleaningRequestId: "request-1", toStatus: "REVIEWING" }, { database: db as never, emailProvider: provider });
  assert.equal(result.success, true); assert.equal(db.state.status, CleaningRequestStatus.REVIEWING); assert.equal(db.history.length, 1); assert.equal(db.notifications.length, 1); assert.equal(db.notifications[0].type, "REQUEST_ACCEPTED_CUSTOMER"); assert.equal(db.notifications[0].status, NotificationStatus.SENT); assert.match(db.notifications[0].content, /reviewing it/);
});

test("accept delivery failure preserves REVIEWING and reports lifecycle success", async () => {
  const db = database();
  const result = await transitionCleaningRequestStatusForAdmin("admin-1", { cleaningRequestId: "request-1", toStatus: "REVIEWING" }, { database: db as never, emailProvider: { async sendEmail() { return { success: false as const, errorCode: "PROVIDER_UNAVAILABLE" as const }; } } });
  assert.equal(result.success, true); assert.equal(db.state.status, CleaningRequestStatus.REVIEWING); assert.equal(db.notifications[0].status, NotificationStatus.FAILED);
});

test("decline creates only the declined notification with the normalized reason", async () => {
  const db = database();
  const result = await transitionCleaningRequestStatusForAdmin("admin-1", { cleaningRequestId: "request-1", toStatus: "CANCELLED", reason: " Outside <service> area " }, { database: db as never, emailProvider: { async sendEmail() { return { success: true as const, providerMessageId: "re_decline" }; } } });
  assert.equal(result.success, true); assert.equal(db.state.status, CleaningRequestStatus.CANCELLED); assert.equal(db.state.cancellationReason, "Outside <service> area"); assert.equal(db.notifications.length, 1); assert.equal(db.notifications[0].type, "REQUEST_DECLINED_CUSTOMER"); assert.match(db.notifications[0].content, /Outside &lt;service&gt; area/); assert.doesNotMatch(db.notifications[0].content, /AdminUser|internalNotes/);
});

test("notification persistence failure rolls back accept or decline", async () => {
  for (const toStatus of [CleaningRequestStatus.REVIEWING, CleaningRequestStatus.CANCELLED]) {
    const db = database({ failNotification: true });
    const result = await transitionCleaningRequestStatusForAdmin("admin-1", { cleaningRequestId: "request-1", toStatus, ...(toStatus === CleaningRequestStatus.CANCELLED ? { reason: "Outside area" } : {}) }, { database: db as never });
    assert.deepEqual(result, { success: false, reason: "INTERNAL_ERROR" }); assert.equal(db.state.status, CleaningRequestStatus.NEW); assert.equal(db.history.length, 0); assert.equal(db.notifications.length, 0);
  }
});

test("stale or invalid lifecycle transitions create no customer notification", async () => {
  const stale = database({ conflict: true });
  const result = await transitionCleaningRequestStatusForAdmin("admin-1", { cleaningRequestId: "request-1", toStatus: "REVIEWING" }, { database: stale as never });
  assert.deepEqual(result, { success: false, reason: "STATUS_CONFLICT" }); assert.equal(stale.notifications.length, 0);
  const invalid = database(); invalid.state.status = CleaningRequestStatus.REVIEWING;
  const invalidResult = await transitionCleaningRequestStatusForAdmin("admin-1", { cleaningRequestId: "request-1", toStatus: "REVIEWING" }, { database: invalid as never });
  assert.deepEqual(invalidResult, { success: false, reason: "INVALID_TRANSITION" }); assert.equal(invalid.notifications.length, 0);
});
