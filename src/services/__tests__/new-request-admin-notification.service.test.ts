import assert from "node:assert/strict";
import test from "node:test";
import { NotificationStatus, Prisma, PropertyType } from "../../generated/prisma/client";
import type { ValidatedCleaningRequestCommand } from "../cleaning-request-validation.service";
import { createCleaningRequest, type CleaningRequestCreationOptions } from "../cleaning-request.service";

const command: ValidatedCleaningRequestCommand = {
  serviceId: "service-1", propertyType: PropertyType.HOUSE, bedrooms: 2, bathrooms: "1.5", extraIds: ["extra-1"],
  preferredDate: "2026-08-21", preferredTimeWindow: "MORNING", customerName: "Jane Smith", customerEmail: "jane@example.com", customerPhone: "+19735551234",
  addressLine1: "123 Main St", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", customerNotes: "Leave a note.",
};

type FakeNotification = Record<string, unknown> & { id: string; status: string; attemptCount: number };
type FakeNotificationApi = {
  create: (args: { data: Record<string, unknown> }) => Promise<FakeNotification>;
  findUnique: (args: { where: { id: string } }) => Promise<FakeNotification | null>;
  updateMany: (args: { where: { id: string; status?: { in: string[] } | string }; data: Record<string, unknown> }) => Promise<{ count: number }>;
};
type FakeTransaction = {
  cleaningRequest: { findMany: () => Promise<Array<{ requestNumber: string }>>; create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
  cleaningService: { findUnique: () => Promise<{ name: string } | null> };
  cleaningExtra: { findMany: () => Promise<Array<{ name: string }>> };
  notification: FakeNotificationApi;
};

function database(options: { failNotification?: boolean } = {}) {
  const requests: Array<Record<string, unknown>> = [];
  const notifications: FakeNotification[] = [];
  let nextRequestId = 1;
  const notificationApi = {
    async create({ data }: { data: Record<string, unknown> }) {
      if (options.failNotification) throw new Error("notification write failed");
      const notification = { ...data, id: `notification-${notifications.length + 1}`, status: String(data.status), attemptCount: 0, providerMessageId: null } as unknown as FakeNotification;
      notifications.push(notification);
      return notification;
    },
    async findUnique({ where }: { where: { id: string } }) { return notifications.find((notification) => notification.id === where.id) ?? null; },
    async updateMany({ where, data }: { where: { id: string; status?: { in: string[] } | string }; data: Record<string, unknown> }) {
      const notification = notifications.find((item) => item.id === where.id);
      const expected = typeof where.status === "object" ? where.status.in.includes(notification?.status ?? "") : notification?.status === where.status;
      if (!notification || !expected) return { count: 0 };
      for (const [key, value] of Object.entries(data)) {
        notification[key] = key === "attemptCount" && typeof value === "object" && value !== null && "increment" in value
          ? notification.attemptCount + Number(value.increment)
          : value;
      }
      return { count: 1 };
    },
  };
  const database = {
    requests, notifications,
    notification: notificationApi,
    async $transaction<T>(callback: (transaction: FakeTransaction) => Promise<T>) {
      const requestSnapshot = requests.length;
      const notificationSnapshot = notifications.length;
      try {
        return await callback({
          cleaningRequest: {
            async findMany() { return requests.map((request) => ({ requestNumber: request.requestNumber as string })); },
            async create({ data }: { data: Record<string, unknown> }) {
              const request: Record<string, unknown> = { ...data, id: `request-${nextRequestId++}` };
              requests.push(request);
              return { id: request.id as string, requestNumber: request.requestNumber as string, status: request.status, estimateOutcome: request.estimateOutcome, estimatedPrice: request.estimatedPrice as Prisma.Decimal | null };
            },
          },
          cleaningService: { async findUnique() { return { name: "Standard Cleaning" }; } },
          cleaningExtra: { async findMany() { return [{ name: "Inside Oven" }]; } },
          notification: notificationApi,
        });
      } catch (error) {
        requests.splice(requestSnapshot);
        notifications.splice(notificationSnapshot);
        throw error;
      }
    },
  };
  return database;
}

function optionsFor(db: ReturnType<typeof database>, overrides: Partial<CleaningRequestCreationOptions> = {}): CleaningRequestCreationOptions {
  return {
    database: db as never,
    now: new Date("2026-08-11T16:00:00Z"),
    validator: async () => ({ success: true as const, data: command }),
    pricingResolver: async () => ({ success: true as const, propertyType: PropertyType.HOUSE, bedroomCount: 2, startingPrice: new Prisma.Decimal("200.00"), pricingRuleId: "rule-1" }),
    businessNotificationEnv: { BUSINESS_NOTIFICATION_EMAIL: " owner@example.com ", BUSINESS_NOTIFICATION_NAME: "Just Cleaning" },
    ...overrides,
  };
}

test("creates one pending NEW_REQUEST_ADMIN intent atomically and delivers after commit", async () => {
  const db = database();
  const provider = { async sendEmail(input: { idempotencyKey: string }) { assert.equal(input.idempotencyKey, "notification/notification-1"); return { success: true as const, providerMessageId: "re_1" }; } };
  const result = await createCleaningRequest({}, optionsFor(db, { emailProvider: provider }));
  assert.equal(result.success, true);
  assert.equal(db.requests.length, 1);
  assert.equal(db.requests[0].status, "NEW");
  assert.equal(db.notifications.length, 1);
  assert.equal(db.notifications[0].type, "NEW_REQUEST_ADMIN");
  assert.equal(db.notifications[0].channel, "EMAIL");
  assert.equal(db.notifications[0].status, NotificationStatus.SENT);
  assert.equal(db.notifications[0].recipientEmail, "owner@example.com");
  assert.match(String(db.notifications[0].subject), /JC-2026-0001/);
  assert.match(String(db.notifications[0].content), /Jane Smith/);
});

test("provider failure keeps the request successful and NEW while notification remains retryable", async () => {
  const db = database();
  const result = await createCleaningRequest({}, optionsFor(db, { emailProvider: { async sendEmail() { return { success: false as const, errorCode: "PROVIDER_UNAVAILABLE" as const }; } } }));
  assert.equal(result.success, true);
  assert.equal(db.requests[0].status, "NEW");
  assert.equal(db.notifications[0].status, NotificationStatus.FAILED);
  assert.equal(db.notifications[0].attemptCount, 1);
});

test("notification intent failure rolls back request creation", async () => {
  const db = database({ failNotification: true });
  const result = await createCleaningRequest({}, optionsFor(db));
  assert.deepEqual(result, { success: false, reason: "INTERNAL_ERROR" });
  assert.equal(db.requests.length, 0);
  assert.equal(db.notifications.length, 0);
});

test("missing business recipient configuration does not block request creation or fabricate history", async () => {
  const db = database();
  const result = await createCleaningRequest({}, optionsFor(db, { businessNotificationEnv: {} }));
  assert.equal(result.success, true);
  assert.equal(db.requests.length, 1);
  assert.equal(db.notifications.length, 0);
});
