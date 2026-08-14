/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import { CleaningRequestStatus, Prisma, NotificationStatus } from "../../generated/prisma/client.js";
import { completeCleaningForAdmin, startCleaningForAdmin } from "../cleaning-request-workflow.service.js";

function database(status: CleaningRequestStatus = CleaningRequestStatus.ASSIGNED, email: string | null = "jane.old@example.com", notificationFailure = false) {
  const state: any = { id: "request-1", requestNumber: "JC-2026-0001", status, confirmedPrice: new Prisma.Decimal("250"), scheduledStart: new Date("2090-01-01T10:00:00Z"), scheduledEnd: new Date("2090-01-01T12:00:00Z"), customerEmail: email, customerName: "Jane", addressLine1: "123 Main Street", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", service: { name: "Deep Cleaning" }, assignments: [{ id: "assignment-1" }] };
  const history: any[] = [];
  const notifications = new Map<string, any>();
  let notificationSequence = 0;
  const tx: any = {
    cleaningRequest: {
      findUnique: async () => state,
      updateMany: async ({ where }: any) => { if (where.status !== state.status) return { count: 0 }; state.status = where.status === CleaningRequestStatus.ASSIGNED ? CleaningRequestStatus.IN_PROGRESS : CleaningRequestStatus.COMPLETED; return { count: 1 }; },
    },
    cleaningRequestStatusHistory: { create: async ({ data }: any) => { const row = { id: `history-${history.length + 1}`, ...data }; history.push(row); return row; } },
    notification: {
      create: async ({ data }: any) => { if (notificationFailure) throw new Error("notification persistence failed"); const row = { id: `notification-${++notificationSequence}`, channel: "EMAIL", status: NotificationStatus.PENDING, attemptCount: 0, providerMessageId: null, ...data }; notifications.set(row.id, row); return row; },
      findUnique: async ({ where }: any) => notifications.get(where.id) ?? null,
      updateMany: async ({ where, data }: any) => { const row = notifications.get(where.id); if (!row || (where.status?.in && !where.status.in.includes(row.status)) || (typeof where.status === "string" && row.status !== where.status)) return { count: 0 }; Object.entries(data).forEach(([key, value]: any) => { row[key] = key === "attemptCount" ? row[key] + value.increment : value; }); return { count: 1 }; },
    },
  };
  const database: any = { notifications, notification: tx.notification, $transaction: async (callback: (transaction: any) => Promise<unknown>) => { const beforeStatus = state.status; const beforeHistory = history.length; try { return await callback(tx); } catch (error) { state.status = beforeStatus; history.splice(beforeHistory); notifications.clear(); throw error; } } };
  return { state, history, notifications, database };
}

const successProvider = { async sendEmail(input: { idempotencyKey: string }) { assert.match(input.idempotencyKey, /^notification\//); return { success: true as const, providerMessageId: "re_123" }; } };
const failedProvider = { async sendEmail() { return { success: false as const, errorCode: "PROVIDER_REJECTED" as const }; } };

test("start atomically creates and delivers one started notification", async () => {
  const f = database();
  const result = await startCleaningForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: f.database, emailProvider: successProvider });
  assert.equal(result.success, true);
  assert.equal(f.state.status, CleaningRequestStatus.IN_PROGRESS);
  assert.deepEqual(f.history.map((row) => [row.fromStatus, row.toStatus]), [["ASSIGNED", "IN_PROGRESS"]]);
  assert.equal(f.notifications.size, 1);
  const notification = [...f.notifications.values()][0];
  assert.equal(notification.type, "CLEANING_STARTED_CUSTOMER");
  assert.equal(notification.recipientEmail, "jane.old@example.com");
  assert.equal(notification.status, NotificationStatus.SENT);
  assert.match(notification.subject, /Your cleaning has started/);
  assert.match(notification.content, /123 Main Street/);
});

test("completion atomically creates a completed notification and delivery failure does not reopen work", async () => {
  const f = database(CleaningRequestStatus.IN_PROGRESS);
  const result = await completeCleaningForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: f.database, emailProvider: failedProvider });
  assert.equal(result.success, true);
  assert.equal(f.state.status, CleaningRequestStatus.COMPLETED);
  assert.equal(f.history[0].toStatus, CleaningRequestStatus.COMPLETED);
  assert.equal([...f.notifications.values()][0].type, "CLEANING_COMPLETED_CUSTOMER");
  assert.equal([...f.notifications.values()][0].status, NotificationStatus.FAILED);
});

test("notification persistence failure rolls back the lifecycle transition", async () => {
  const started = database(CleaningRequestStatus.ASSIGNED, "jane@example.com", true);
  const startResult = await startCleaningForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: started.database, emailProvider: successProvider });
  assert.deepEqual(startResult, { success: false, reason: "INTERNAL_ERROR" });
  assert.equal(started.state.status, CleaningRequestStatus.ASSIGNED);
  assert.equal(started.history.length, 0);
  assert.equal(started.notifications.size, 0);

  const completed = database(CleaningRequestStatus.IN_PROGRESS, "jane@example.com", true);
  const completeResult = await completeCleaningForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: completed.database, emailProvider: successProvider });
  assert.deepEqual(completeResult, { success: false, reason: "INTERNAL_ERROR" });
  assert.equal(completed.state.status, CleaningRequestStatus.IN_PROGRESS);
  assert.equal(completed.history.length, 0);
});

test("invalid status, readiness failures, and unusable legacy email create no milestone notification", async () => {
  const wrongStatus = database(CleaningRequestStatus.CONFIRMED);
  assert.equal((await startCleaningForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: wrongStatus.database })).success, false);
  assert.equal(wrongStatus.notifications.size, 0);
  const noEmail = database(CleaningRequestStatus.ASSIGNED, "not-an-email");
  const result = await startCleaningForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: noEmail.database, emailProvider: successProvider });
  assert.equal(result.success, true);
  assert.equal(noEmail.state.status, CleaningRequestStatus.IN_PROGRESS);
  assert.equal(noEmail.notifications.size, 0);
  const noWorker = database(CleaningRequestStatus.ASSIGNED);
  noWorker.state.assignments = [];
  const noWorkerResult = await startCleaningForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: noWorker.database });
  assert.equal(noWorkerResult.success, false);
  if (!noWorkerResult.success) assert.equal(noWorkerResult.reason, "NO_ASSIGNED_WORKERS");
  assert.equal(noWorker.notifications.size, 0);
});
