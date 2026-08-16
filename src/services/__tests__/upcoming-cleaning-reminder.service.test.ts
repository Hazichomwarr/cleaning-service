/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, CleaningRequestStatus, NotificationStatus } from "../../generated/prisma/client.js";
import { getUpcomingCleaningReminderWindow, isWithinUpcomingCleaningReminderWindow, processUpcomingCleaningReminders, upcomingCleaningDeduplicationKey } from "../upcoming-cleaning-reminder.service.js";

const now = new Date("2026-08-14T15:00:00.000Z");
function request(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "request-1", requestNumber: "JC-2026-0001", status: CleaningRequestStatus.CONFIRMED, customerEmail: "jane@example.com", customerName: "Jane",
    propertyType: "HOUSE" as const, confirmedPrice: new Prisma.Decimal("250.00"), scheduledStart: new Date("2026-08-15T15:00:00.000Z"), scheduledEnd: new Date("2026-08-15T17:00:00.000Z"),
    addressLine1: "123 Main Street", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", service: { name: "Deep Cleaning" }, requestExtras: [], ...overrides,
  };
}

function database(rows: ReturnType<typeof request>[]) {
  const notifications = new Map<string, any>();
  let nextId = 1;
  const db: any = {
    notifications,
    cleaningRequest: {
      async findMany() { return rows; },
      async findUnique({ where }: any) { return rows.find((row) => row.id === where.id) ?? null; },
    },
    notification: {
      async create({ data }: any) {
        if (notifications.has(data.deduplicationKey)) throw Object.assign(new Error("unique"), { code: "P2002" });
        const row = { id: `notification-${nextId++}`, channel: "EMAIL", attemptCount: 0, providerMessageId: null, ...data };
        notifications.set(data.deduplicationKey, row); return row;
      },
      async findUnique({ where }: any) {
        if (where.id) return [...notifications.values()].find((row) => row.id === where.id) ?? null;
        return notifications.get(where.deduplicationKey) ?? null;
      },
      async updateMany({ where, data }: any) {
        const row = [...notifications.values()].find((item) => item.id === where.id);
        const allowed = row && (where.status?.in?.includes(row.status) ?? row.status === where.status);
        if (!allowed) return { count: 0 };
        Object.entries(data).forEach(([key, value]: any) => { row[key] = key === "attemptCount" ? row[key] + value.increment : value; });
        return { count: 1 };
      },
    },
  };
  db.$transaction = async (callback: (transaction: any) => Promise<unknown>) => callback(db);
  return db;
}

test("selects the next New York calendar day", () => {
  const window = getUpcomingCleaningReminderWindow(now);
  assert.equal(window.start.toISOString(), "2026-08-15T04:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-08-16T04:00:00.000Z");
  assert.equal(isWithinUpcomingCleaningReminderWindow(new Date("2026-08-15T04:00:00Z"), window), true);
  assert.equal(isWithinUpcomingCleaningReminderWindow(new Date("2026-08-16T03:59:59Z"), window), true);
  assert.equal(isWithinUpcomingCleaningReminderWindow(window.end, window), false);
});

test("includes tomorrow morning, afternoon, and evening but excludes today and the day after tomorrow", async () => {
  const rows = [
    request({ id: "morning", scheduledStart: new Date("2026-08-17T12:00:00Z"), scheduledEnd: new Date("2026-08-17T14:00:00Z") }),
    request({ id: "afternoon", scheduledStart: new Date("2026-08-17T17:00:00Z"), scheduledEnd: new Date("2026-08-17T19:00:00Z") }),
    request({ id: "evening", scheduledStart: new Date("2026-08-18T00:00:00Z"), scheduledEnd: new Date("2026-08-18T02:00:00Z") }),
    request({ id: "today", scheduledStart: new Date("2026-08-16T17:00:00Z"), scheduledEnd: new Date("2026-08-16T19:00:00Z") }),
    request({ id: "day-after", scheduledStart: new Date("2026-08-18T17:00:00Z"), scheduledEnd: new Date("2026-08-18T19:00:00Z") }),
  ];
  const db = database(rows as ReturnType<typeof request>[]);
  const result = await processUpcomingCleaningReminders({ database: db, now: new Date("2026-08-16T16:00:00Z"), emailProvider: { async sendEmail() { return { success: true as const, providerMessageId: "re" }; } } });
  assert.equal(result.created, 3);
  assert.equal(db.notifications.size, 3);
});

test("uses New York calendar boundaries and remains DST-safe", () => {
  const beforeMidnight = getUpcomingCleaningReminderWindow(new Date("2026-08-15T03:59:59Z"));
  const afterMidnight = getUpcomingCleaningReminderWindow(new Date("2026-08-15T04:00:00Z"));
  assert.equal(beforeMidnight.start.toISOString(), "2026-08-15T04:00:00.000Z");
  assert.equal(afterMidnight.start.toISOString(), "2026-08-16T04:00:00.000Z");

  const spring = getUpcomingCleaningReminderWindow(new Date("2026-03-07T17:00:00Z"));
  assert.equal(spring.start.toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(spring.end.toISOString(), "2026-03-09T04:00:00.000Z");
  const fall = getUpcomingCleaningReminderWindow(new Date("2026-10-31T16:00:00Z"));
  assert.equal(fall.start.toISOString(), "2026-11-01T04:00:00.000Z");
  assert.equal(fall.end.toISOString(), "2026-11-02T05:00:00.000Z");
});

test("uses request occurrence identity and creates only one reminder across runs", async () => {
  const db = database([request()]);
  const provider = { async sendEmail() { return { success: true as const, providerMessageId: "re_1" }; } };
  const first = await processUpcomingCleaningReminders({ database: db, now, emailProvider: provider });
  const second = await processUpcomingCleaningReminders({ database: db, now, emailProvider: provider });
  assert.equal(first.created, 1);
  assert.equal(second.existing, 1);
  assert.equal(db.notifications.size, 1);
  assert.equal([...db.notifications.values()][0].status, NotificationStatus.SENT);
  assert.equal(upcomingCleaningDeduplicationKey("request-1", request().scheduledStart!, request().scheduledEnd!), "upcoming-cleaning:request-1:2026-08-15T15:00:00.000Z:2026-08-15T17:00:00.000Z");
  assert.notEqual(upcomingCleaningDeduplicationKey("request-1", request().scheduledStart!, request().scheduledEnd!), upcomingCleaningDeduplicationKey("request-1", new Date("2026-08-16T15:00:00Z"), new Date("2026-08-16T17:00:00Z")));
});

test("only confirmed/assigned requests with complete schedule, price, and email are processed", async () => {
  const rows = [
    request({ id: "confirmed", status: CleaningRequestStatus.CONFIRMED }),
    request({ id: "assigned", status: CleaningRequestStatus.ASSIGNED }),
    request({ id: "reviewing", status: CleaningRequestStatus.REVIEWING }),
    request({ id: "new", status: CleaningRequestStatus.NEW }),
    request({ id: "in-progress", status: CleaningRequestStatus.IN_PROGRESS }),
    request({ id: "completed", status: CleaningRequestStatus.COMPLETED }),
    request({ id: "cancelled", status: CleaningRequestStatus.CANCELLED }),
    request({ id: "no-price", confirmedPrice: null }),
    request({ id: "no-email", customerEmail: "invalid" }),
    request({ id: "no-schedule", scheduledEnd: null }),
  ];
  const db = database(rows as ReturnType<typeof request>[]);
  const result = await processUpcomingCleaningReminders({ database: db, now, emailProvider: { async sendEmail() { return { success: true as const, providerMessageId: "re" }; } } });
  assert.equal(result.scanned, rows.length);
  assert.equal(result.created, 2);
  assert.equal(db.notifications.size, 2);
});

test("failed delivery remains retryable on the same notification", async () => {
  const db = database([request()]);
  const failed = await processUpcomingCleaningReminders({ database: db, now, emailProvider: { async sendEmail() { return { success: false as const, errorCode: "PROVIDER_REJECTED" as const }; } } });
  const retried = await processUpcomingCleaningReminders({ database: db, now, emailProvider: { async sendEmail() { return { success: true as const, providerMessageId: "re_retry" }; } } });
  assert.equal(failed.failed, 1);
  assert.equal(retried.existing, 1);
  assert.equal(db.notifications.size, 1);
  assert.equal([...db.notifications.values()][0].attemptCount, 2);
  assert.equal([...db.notifications.values()][0].status, NotificationStatus.SENT);
});
