import assert from "node:assert/strict";
import test from "node:test";
import { CleaningRequestStatus, NotificationStatus, Prisma } from "../../generated/prisma/client";
import { confirmCleaningRequestForAdmin } from "../cleaning-request-confirmation.service";

type Notice = { id: string; type: string; channel: string; status: NotificationStatus; recipientEmail: string; recipientName: string | null; subject: string; content: string; attemptCount: number; providerMessageId: string | null };

function database(overrides: { status?: CleaningRequestStatus; confirmedPrice?: Prisma.Decimal | null; schedule?: boolean; failNotification?: boolean; conflict?: boolean } = {}) {
  const state = { id: "request-1", requestNumber: "JC-2026-0001", status: overrides.status ?? CleaningRequestStatus.REVIEWING, confirmedPrice: overrides.confirmedPrice ?? new Prisma.Decimal("250.00"), scheduledStart: overrides.schedule === false ? null : new Date("2026-08-18T14:00:00Z"), scheduledEnd: overrides.schedule === false ? null : new Date("2026-08-18T16:00:00Z") };
  const history: Array<{ id: string; fromStatus: CleaningRequestStatus; toStatus: CleaningRequestStatus; reason: string | null; createdAt: Date }> = [];
  const notifications: Notice[] = [];
  const notification = {
    async create({ data }: { data: Record<string, unknown> }) {
      if (overrides.failNotification) throw new Error("notification failure");
      const notice: Notice = { id: `notification-${notifications.length + 1}`, type: String(data.type), channel: String(data.channel), status: data.status as NotificationStatus, recipientEmail: String(data.recipientEmail), recipientName: (data.recipientName as string | null) ?? null, subject: String(data.subject), content: String(data.content), attemptCount: 0, providerMessageId: null };
      notifications.push(notice); return notice;
    },
    async findUnique({ where }: { where: { id: string } }) { return notifications.find((notice) => notice.id === where.id) ?? null; },
    async updateMany({ where, data }: { where: { id: string; status?: { in: NotificationStatus[] } | NotificationStatus }; data: Record<string, unknown> }) {
      const notice = notifications.find((item) => item.id === where.id);
      const allowed = typeof where.status === "object" ? where.status.in.includes(notice?.status as NotificationStatus) : notice?.status === where.status;
      if (!notice || !allowed) return { count: 0 };
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
            async findUnique() {
              return { ...state, customerEmail: "old@example.com", customerName: "Jane", propertyType: "HOUSE" as const, bedrooms: 2, bathrooms: new Prisma.Decimal("1.5"), addressLine1: "123 Main", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", service: { name: "Deep Cleaning" }, requestExtras: [{ cleaningExtra: { name: "Inside Oven" } }] };
            },
            async updateMany() { if (overrides.conflict) return { count: 0 }; state.status = CleaningRequestStatus.CONFIRMED; return { count: 1 }; },
          },
          cleaningRequestStatusHistory: {
            async create({ data }: { data: Record<string, unknown> }) { const item = { id: `history-${history.length + 1}`, fromStatus: data.fromStatus as CleaningRequestStatus, toStatus: data.toStatus as CleaningRequestStatus, reason: data.reason as string | null, createdAt: data.createdAt as Date }; history.push(item); return item; },
          },
          notification,
        } as never);
      } catch (error) { Object.assign(state, before); history.splice(historyLength); notifications.splice(notificationLength); throw error; }
    },
  };
  return db;
}

test("confirmation creates one snapshot notification and delivers after commit", async () => {
  const db = database();
  const result = await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: db as never, emailProvider: { async sendEmail(input: { to: string; idempotencyKey: string }) { assert.equal(input.to, "old@example.com"); assert.equal(input.idempotencyKey, "notification/notification-1"); return { success: true as const, providerMessageId: "re_confirmed" }; } } });
  assert.equal(result.success, true); assert.equal(db.state.status, CleaningRequestStatus.CONFIRMED); assert.equal(db.history.length, 1); assert.equal(db.notifications.length, 1); assert.equal(db.notifications[0].type, "REQUEST_CONFIRMED_CUSTOMER"); assert.equal(db.notifications[0].status, NotificationStatus.SENT); assert.match(db.notifications[0].content, /\$250\.00/); assert.match(db.notifications[0].content, /10:00 AM–12:00 PM/); assert.doesNotMatch(db.notifications[0].content, /\$200\.00/);
});

test("provider failure preserves CONFIRMED and keeps confirmation successful", async () => {
  const db = database();
  const result = await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: db as never, emailProvider: { async sendEmail() { return { success: false as const, errorCode: "PROVIDER_UNAVAILABLE" as const }; } } });
  assert.equal(result.success, true); assert.equal(db.state.status, CleaningRequestStatus.CONFIRMED); assert.equal(db.history.length, 1); assert.equal(db.notifications[0].status, NotificationStatus.FAILED);
});

test("notification persistence failure rolls confirmation back", async () => {
  const db = database({ failNotification: true });
  const result = await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: db as never });
  assert.deepEqual(result, { success: false, reason: "INTERNAL_ERROR" }); assert.equal(db.state.status, CleaningRequestStatus.REVIEWING); assert.equal(db.history.length, 0); assert.equal(db.notifications.length, 0);
});

test("missing prerequisites and wrong status create no notification", async () => {
  const missing = database({ schedule: false });
  assert.equal((await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: missing as never })).success, false); assert.equal(missing.notifications.length, 0);
  const wrong = database({ status: CleaningRequestStatus.NEW });
  assert.deepEqual(await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: wrong as never }), { success: false, reason: "INVALID_REQUEST_STATUS" }); assert.equal(wrong.notifications.length, 0);
});

test("confirmation conflict creates no notification", async () => {
  const db = database({ conflict: true });
  const result = await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: db as never });
  assert.deepEqual(result, { success: false, reason: "STATUS_CONFLICT" }); assert.equal(db.notifications.length, 0);
});
