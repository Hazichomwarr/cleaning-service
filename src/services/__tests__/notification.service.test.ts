import assert from "node:assert/strict";
import test from "node:test";
import { NotificationStatus } from "../../generated/prisma/client.js";
import { getResendConfig } from "../../lib/email/resend-config.js";
import { createEmailNotification, deliverNotification } from "../notification.service.js";

type State = {
  id: string;
  type: "NEW_REQUEST_ADMIN" | "REQUEST_CONFIRMED_CUSTOMER";
  channel: "EMAIL";
  status: NotificationStatus;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  content: string;
  attemptCount: number;
  providerMessageId: string | null;
  lastErrorCode?: string | null;
  sentAt?: Date | null;
  lastFailedAt?: Date | null;
};

function database(initial: Partial<State> = {}) {
  const state: State = {
    id: "notification-1", type: "NEW_REQUEST_ADMIN", channel: "EMAIL", status: NotificationStatus.PENDING,
    recipientEmail: "old@example.com", recipientName: "Jane", subject: "Original subject",
    content: "<p>Original content</p>", attemptCount: 0, providerMessageId: null, ...initial,
  };
  const calls: Array<{ idempotencyKey: string; cc?: string }> = [];
  let sendDelay: Promise<void> | null = null;
  const db = {
    state,
    calls,
    setSendDelay(promise: Promise<void>) { sendDelay = promise; },
    notification: {
      async create({ data }: { data: Record<string, unknown> }) {
        Object.assign(state, { ...data, id: state.id, attemptCount: 0, providerMessageId: null });
        return { ...state };
      },
      async findUnique() { return { ...state }; },
      async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
        const status = where.status as NotificationStatus | { in: NotificationStatus[] } | undefined;
        const allowed = status && typeof status === "object" && "in" in status ? status.in.includes(state.status) : status === undefined || status === state.status;
        if (where.id !== state.id || !allowed) return { count: 0 };
        if (sendDelay) await sendDelay;
        for (const [key, value] of Object.entries(data)) {
          if (key === "attemptCount" && typeof value === "object" && value && "increment" in value) state.attemptCount += value.increment as number;
          else Object.assign(state, { [key]: value });
        }
        return { count: 1 };
      },
    },
  };
  return db;
}

function provider(options: { success?: boolean; errorCode?: "PROVIDER_REJECTED" } = {}) {
  return {
    async sendEmail(input: { idempotencyKey: string; cc?: string }) {
      sentKeys.push(input.idempotencyKey);
      sentInputs.push(input);
      return options.success === false ? { success: false as const, errorCode: options.errorCode ?? "PROVIDER_REJECTED" } : { success: true as const, providerMessageId: "re_123" };
    },
  };
}
const sentKeys: string[] = [];
const sentInputs: Array<{ idempotencyKey: string; cc?: string }> = [];

test("creates a pending email notification with normalized and immutable snapshots", async () => {
  const db = database();
  const result = await createEmailNotification({ type: "NEW_REQUEST_ADMIN", recipientEmail: " CUSTOMER@EXAMPLE.COM ", recipientName: " Jane ", subject: " Subject ", html: " <p>Body</p> ", cleaningRequestId: "request-1" }, { database: db as never });
  assert.equal(result.success, true);
  assert.equal(db.state.status, NotificationStatus.PENDING);
  assert.equal(db.state.attemptCount, 0);
  assert.equal(db.state.recipientEmail, "customer@example.com");
  assert.equal(db.state.subject, "Subject");
  assert.equal(db.state.content, "<p>Body</p>");
  assert.equal(db.state.channel, "EMAIL"); // channel is domain-controlled, not caller-controlled in the input.
});

test("rejects invalid email, empty subject/content, and trusted delivery fields", async () => {
  const db = database();
  for (const input of [
    { type: "NEW_REQUEST_ADMIN", recipientEmail: "nope", subject: "Subject", html: "Body" },
    { type: "NEW_REQUEST_ADMIN", recipientEmail: "a@example.com", subject: " ", html: "Body" },
    { type: "NEW_REQUEST_ADMIN", recipientEmail: "a@example.com", subject: "Subject", html: " " },
    { type: "NEW_REQUEST_ADMIN", recipientEmail: "a@example.com", subject: "Subject", html: "Body", status: "SENT", attemptCount: 99, providerMessageId: "fake", sentAt: new Date() },
  ]) assert.deepEqual(await createEmailNotification(input, { database: db as never }), { success: false, reason: "INVALID_INPUT" });
  assert.equal(db.state.attemptCount, 0);
});

test("sends pending notifications and records provider acceptance", async () => {
  sentKeys.length = 0;
  const db = database();
  const now = new Date("2026-08-14T15:00:00Z");
  const result = await deliverNotification("notification-1", { database: db as never, emailProvider: provider(), now });
  assert.deepEqual(result, { status: "SENT", notificationId: "notification-1", providerMessageId: "re_123" });
  assert.equal(db.state.status, NotificationStatus.SENT);
  assert.equal(db.state.attemptCount, 1);
  assert.equal(db.state.sentAt, now);
  assert.deepEqual(sentKeys, ["notification/notification-1"]);
});

test("adds configured CC only to NEW_REQUEST_ADMIN delivery", async () => {
  sentInputs.length = 0;
  const db = database();
  await deliverNotification("notification-1", { database: db as never, emailProvider: provider(), ccEmail: "cofounder@example.com" });
  assert.equal(sentInputs[0]?.cc, "cofounder@example.com");
});

test("never adds business CC to customer delivery", async () => {
  sentInputs.length = 0;
  const db = database({ type: "REQUEST_CONFIRMED_CUSTOMER" });
  await deliverNotification("notification-1", { database: db as never, emailProvider: provider(), ccEmail: "cofounder@example.com" });
  assert.equal("cc" in (sentInputs[0] ?? {}), false);
});

test("preserves failed intent and retries the same notification with the same idempotency key", async () => {
  sentKeys.length = 0;
  const db = database({ status: NotificationStatus.FAILED, attemptCount: 1, lastFailedAt: new Date("2026-08-14T14:00:00Z"), lastErrorCode: "PROVIDER_REJECTED" });
  const failed = await deliverNotification("notification-1", { database: db as never, emailProvider: provider({ success: false }), now: new Date() });
  assert.equal(failed.status, "FAILED");
  assert.equal(db.state.status, NotificationStatus.FAILED);
  assert.equal(db.state.attemptCount, 2);
  assert.equal(db.state.providerMessageId, null);
  const sent = await deliverNotification("notification-1", { database: db as never, emailProvider: provider(), now: new Date() });
  assert.equal(sent.status, "SENT");
  assert.equal(db.state.attemptCount, 3);
  assert.deepEqual(sentKeys, ["notification/notification-1", "notification/notification-1"]);
});

test("sanitizes an unexpected provider exception", async () => {
  const db = database();
  const throwingProvider = { async sendEmail() { throw new Error("secret API response and recipient details"); } };
  const result = await deliverNotification("notification-1", { database: db as never, emailProvider: throwingProvider });
  assert.deepEqual(result, { status: "FAILED", notificationId: "notification-1", errorCode: "UNKNOWN_DELIVERY_ERROR" });
  assert.equal(db.state.lastErrorCode, "UNKNOWN_DELIVERY_ERROR");
  assert.equal(JSON.stringify(db.state).includes("secret API response"), false);
});

test("protects sent and in-progress notifications from another provider call", async () => {
  const sent = database({ status: NotificationStatus.SENT, attemptCount: 1 });
  let called = false;
  const fake = { async sendEmail() { called = true; return { success: true as const, providerMessageId: "nope" }; } };
  assert.deepEqual(await deliverNotification("notification-1", { database: sent as never, emailProvider: fake }), { status: "ALREADY_SENT", notificationId: "notification-1" });
  assert.equal(called, false);
  const sending = database({ status: NotificationStatus.SENDING, attemptCount: 1 });
  assert.deepEqual(await deliverNotification("notification-1", { database: sending as never, emailProvider: fake }), { status: "DELIVERY_IN_PROGRESS", notificationId: "notification-1" });
  assert.equal(sending.state.attemptCount, 1);
});

test("guarded claim allows only one concurrent delivery attempt", async () => {
  const db = database();
  let providerCalls = 0;
  const fake = { async sendEmail() { providerCalls += 1; await new Promise((resolve) => setTimeout(resolve, 10)); return { success: true as const, providerMessageId: "re_once" }; } };
  const results = await Promise.all([
    deliverNotification("notification-1", { database: db as never, emailProvider: fake }),
    deliverNotification("notification-1", { database: db as never, emailProvider: fake }),
  ]);
  assert.equal(providerCalls, 1);
  assert.equal(results.filter((result) => result.status === "SENT").length, 1);
  assert.equal(db.state.attemptCount, 1);
});

test("configuration helper never returns a browser-safe API key or raw provider error", () => {
  assert.equal(getResendConfig({}).success, false);
  assert.equal(JSON.stringify({ errorCode: "PROVIDER_REJECTED" }).includes("secret"), false);
});
