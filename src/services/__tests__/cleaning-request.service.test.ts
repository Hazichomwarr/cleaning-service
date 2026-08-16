import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, PropertyType } from "../../generated/prisma/client";
import type { ValidatedCleaningRequestCommand, CleaningRequestValidationResult } from "../cleaning-request-validation.service";
import { createCleaningRequest, type CleaningRequestCreationOptions } from "../cleaning-request.service";

const now = new Date("2026-08-11T16:00:00.000Z");

const command: ValidatedCleaningRequestCommand = {
  serviceId: "service-1", propertyType: PropertyType.HOUSE, bedrooms: 2, bathrooms: "1.5", extraIds: ["extra-1", "extra-2"],
  preferredDate: "2026-08-21", preferredTimeWindow: "MORNING", customerName: "Jane Smith", customerEmail: "jane@example.com", customerPhone: "+19735551234",
  addressLine1: "123 Main St", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", customerNotes: null,
};

const validValidation = (overrides: Partial<ValidatedCleaningRequestCommand> = {}): CleaningRequestValidationResult => ({
  success: true,
  data: { ...command, ...overrides },
});

function pricingSuccess(amount = "200.00") {
  return {
    success: true as const,
    propertyType: PropertyType.HOUSE,
    bedroomCount: 2,
    startingPrice: new Prisma.Decimal(amount),
    pricingRuleId: "rule-2",
  };
}

function fakeDatabase(options: { existing?: string[]; collisionCount?: number; failCreate?: boolean; customers?: Array<{ id: string; email: string | null; phone: string | null; isActive: boolean }> } = {}) {
  let records = [...(options.existing ?? [])].map((requestNumber) => ({ requestNumber }));
  let customers = [...(options.customers ?? [])];
  let collisionsLeft = options.collisionCount ?? 0;
  let transactionCalls = 0;
  let lastData: Record<string, unknown> | undefined;

  const database = {
    $transaction: async <T,>(callback: (transaction: { cleaningRequest: { findMany: (args: unknown) => Promise<Array<{ requestNumber: string }>>; create: (args: { data: Record<string, unknown>; select: unknown }) => Promise<never> } }) => Promise<T>) => {
      transactionCalls += 1;
      const before = [...records];
      const customersBefore = [...customers];
      let attemptedNumber: string | undefined;
      const transaction = {
        cleaningRequest: {
          findMany: async () => records,
          create: async ({ data }: { data: Record<string, unknown> }) => {
            lastData = data;
            attemptedNumber = String(data.requestNumber);
            if (collisionsLeft > 0) {
              collisionsLeft -= 1;
              throw Object.assign(new Error("unique collision"), { code: "P2002", meta: { target: ["requestNumber"] } });
            }
            if (options.failCreate) throw new Error("child write failed");
            const created = {
              id: `request-${records.length + 1}`,
              requestNumber: String(data.requestNumber),
              status: data.status,
              estimateOutcome: data.estimateOutcome,
              estimatedPrice: data.estimatedPrice as Prisma.Decimal | null,
            };
            records = [...records, { requestNumber: created.requestNumber }];
            return created as never;
          },
        },
        customer: {
          findUnique: async () => null,
          findMany: async () => customers.map(({ id, isActive }) => ({ id, isActive })),
          create: async ({ data }: { data: Record<string, unknown> }) => {
            const customer = { id: `customer-${customers.length + 1}`, name: data.name as string, email: data.email as string | null, phone: data.phone as string | null, isActive: true };
            customers = [...customers, customer];
            return { id: customer.id };
          },
        },
      };

      try {
        return await callback(transaction);
      } catch (error) {
        records = before;
        customers = customersBefore;
        if (typeof attemptedNumber === "string" && error && typeof error === "object" && "code" in error && error.code === "P2002") {
          records = [...records, { requestNumber: attemptedNumber }];
        }
        throw error;
      }
    },
    get transactionCalls() { return transactionCalls; },
    get records() { return records; },
    get customers() { return customers; },
    get lastData() { return lastData; },
  };

  return database;
}

function optionsFor(database: ReturnType<typeof fakeDatabase>, overrides: Partial<CleaningRequestCreationOptions> = {}): CleaningRequestCreationOptions {
  return {
    now,
    database,
    validator: async () => validValidation(),
    pricingResolver: async () => pricingSuccess(),
    ...overrides,
  };
}

test("creates an automatic residential request with a Decimal snapshot", async () => {
  const database = fakeDatabase();
  const result = await createCleaningRequest({ ignored: "untrusted" }, optionsFor(database));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.match(result.request.requestNumber, /^JC-2026-\d{4,}$/);
  assert.deepEqual(result.request.estimate, { outcome: "AUTOMATIC_ESTIMATE", amount: "200.00", currency: "USD" });
  assert.equal(database.lastData?.estimatedPrice instanceof Prisma.Decimal, true);
  assert.equal((database.lastData?.estimatedPrice as Prisma.Decimal).toFixed(2), "200.00");
  assert.equal(database.lastData?.status, "NEW");
  assert.equal(database.lastData?.confirmedPrice, null);
  assert.equal(database.lastData?.scheduledStart, null);
  assert.equal(database.lastData?.scheduledEnd, null);
  assert.equal(database.lastData?.cancelledAt, null);
  assert.equal(database.lastData?.cancellationReason, null);
});

test("creates and links a new Customer without creating a saved property", async () => {
  const database = fakeDatabase();
  const result = await createCleaningRequest({}, optionsFor(database));
  assert.equal(result.success, true);
  assert.equal(database.customers.length, 1);
  assert.deepEqual(database.customers[0], { id: "customer-1", name: "Jane Smith", email: "jane@example.com", phone: "+19735551234", isActive: true });
  assert.equal(database.lastData?.customerId, "customer-1");
  assert.equal(database.lastData?.customerPropertyId, null);
  assert.equal(database.lastData?.customerName, "Jane Smith");
  assert.equal(database.lastData?.customerEmail, "jane@example.com");
  assert.equal(database.lastData?.customerPhone, "+19735551234");
});

test("normalizes the new Customer independently from request snapshots", async () => {
  const database = fakeDatabase();
  const result = await createCleaningRequest({}, optionsFor(database, {
    validator: async () => validValidation({ customerEmail: "Jane@Example.COM", customerPhone: "(973) 555-1234" }),
  }));
  assert.equal(result.success, true);
  assert.equal(database.customers[0].email, "jane@example.com");
  assert.equal(database.customers[0].phone, "+19735551234");
  assert.equal(database.lastData?.customerEmail, "Jane@Example.COM");
  assert.equal(database.lastData?.customerPhone, "(973) 555-1234");
});

test("does not create or link for active, inactive, or conflicting identity collisions", async () => {
  for (const customers of [
    [{ id: "active", email: "jane@example.com", phone: null, isActive: true }],
    [{ id: "inactive", email: "jane@example.com", phone: null, isActive: false }],
    [{ id: "email-owner", email: "jane@example.com", phone: null, isActive: true }, { id: "phone-owner", email: null, phone: "+19735551234", isActive: true }],
  ]) {
    const database = fakeDatabase({ customers });
    const result = await createCleaningRequest({}, optionsFor(database));
    assert.equal(result.success, true);
    assert.equal(database.customers.length, customers.length);
    assert.equal(database.lastData?.customerId, null);
  }
});

for (const [label, propertyType, pricingResult, expectedOutcome] of [
  ["office", PropertyType.OFFICE, { success: false, reason: "NOT_RESIDENTIAL" }, "MANUAL_QUOTE_REQUIRED"],
  ["commercial", PropertyType.COMMERCIAL, { success: false, reason: "NOT_RESIDENTIAL" }, "MANUAL_QUOTE_REQUIRED"],
  ["other", PropertyType.OTHER, { success: false, reason: "NOT_RESIDENTIAL" }, "MANUAL_QUOTE_REQUIRED"],
  ["five bedrooms", PropertyType.HOUSE, { success: false, reason: "NO_ACTIVE_RULE" }, "NO_CONFIGURED_ESTIMATE"],
  ["ambiguous pricing", PropertyType.HOUSE, { success: false, reason: "AMBIGUOUS_ACTIVE_RULE" }, "ESTIMATE_UNAVAILABLE"],
] as const) {
  test(`persists ${label} estimate outcome without a numeric price`, async () => {
    const database = fakeDatabase();
    const result = await createCleaningRequest({}, optionsFor(database, {
      validator: async () => validValidation({ propertyType, bedrooms: propertyType === PropertyType.HOUSE ? 5 : null, extraIds: [] }),
      pricingResolver: async () => pricingResult,
    }));
    assert.equal(result.success, true);
    if (result.success) assert.deepEqual(result.request.estimate, { outcome: expectedOutcome, amount: null, currency: "USD" });
    assert.equal(database.lastData?.estimatedPrice, null);
    assert.equal(database.lastData?.estimateOutcome, expectedOutcome);
  });
}

test("passes normalized command values into atomic persistence", async () => {
  const database = fakeDatabase();
  await createCleaningRequest({}, optionsFor(database, { validator: async () => validValidation({ extraIds: [] }) }));
  assert.equal(database.lastData?.preferredTimeWindow, "MORNING");
  assert.deepEqual(database.lastData?.requestExtras, undefined);
  assert.equal((database.lastData?.preferredDate as Date).toISOString(), "2026-08-21T00:00:00.000Z");
  assert.equal((database.lastData?.bathrooms as Prisma.Decimal).toFixed(1), "1.5");
  assert.equal(database.lastData?.customerEmail, "jane@example.com");
  assert.equal(database.lastData?.state, "NJ");
});

test("does not price or persist validation failures", async () => {
  const database = fakeDatabase();
  let pricingCalls = 0;
  const failure: CleaningRequestValidationResult = { success: false, reason: "INVALID_INPUT", fieldErrors: { customerEmail: ["Invalid"] } };
  const result = await createCleaningRequest({}, optionsFor(database, { validator: async () => failure, pricingResolver: async () => { pricingCalls += 1; return pricingSuccess(); } }));
  assert.deepEqual(result, { success: false, reason: "INVALID_INPUT", fieldErrors: { customerEmail: ["Invalid"] } });
  assert.equal(pricingCalls, 0);
  assert.equal(database.transactionCalls, 0);
});

for (const reason of ["SERVICE_UNAVAILABLE", "EXTRA_UNAVAILABLE", "INTERNAL_ERROR"] as const) {
  test(`does not persist validation ${reason}`, async () => {
    const database = fakeDatabase();
    let pricingCalls = 0;
    const result = await createCleaningRequest({}, optionsFor(database, { validator: async () => ({ success: false, reason }), pricingResolver: async () => { pricingCalls += 1; return pricingSuccess(); } }));
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.reason, reason);
    assert.equal(pricingCalls, 0);
    assert.equal(database.transactionCalls, 0);
  });
}

test("does not persist pricing infrastructure failures or contract mismatches", async () => {
  const database = fakeDatabase();
  const thrown = await createCleaningRequest({}, optionsFor(database, { pricingResolver: async () => { throw new Error("database unavailable"); } }));
  assert.deepEqual(thrown, { success: false, reason: "INTERNAL_ERROR" });
  assert.equal(database.transactionCalls, 0);
  const mismatch = await createCleaningRequest({}, optionsFor(database, { pricingResolver: async () => ({ success: false, reason: "INVALID_BEDROOM_COUNT" }) }));
  assert.deepEqual(mismatch, { success: false, reason: "INTERNAL_ERROR" });
  assert.equal(database.transactionCalls, 0);
});

test("retries only request-number collisions and respects the retry bound", async () => {
  const retriedDatabase = fakeDatabase({ existing: ["JC-2026-0001"], collisionCount: 1 });
  const retried = await createCleaningRequest({}, optionsFor(retriedDatabase));
  assert.equal(retried.success, true);
  if (retried.success) assert.equal(retried.request.requestNumber, "JC-2026-0003");
  assert.equal(retriedDatabase.transactionCalls, 2);

  const exhaustedDatabase = fakeDatabase({ collisionCount: 5 });
  const exhausted = await createCleaningRequest({}, optionsFor(exhaustedDatabase, { maxRequestNumberAttempts: 5 }));
  assert.deepEqual(exhausted, { success: false, reason: "INTERNAL_ERROR" });
  assert.equal(exhaustedDatabase.transactionCalls, 5);
});

test("rolls back the transaction when persistence fails", async () => {
  const database = fakeDatabase({ failCreate: true });
  const result = await createCleaningRequest({}, optionsFor(database));
  assert.deepEqual(result, { success: false, reason: "INTERNAL_ERROR" });
  assert.deepEqual(database.records, []);
  assert.deepEqual(database.customers, []);
});
