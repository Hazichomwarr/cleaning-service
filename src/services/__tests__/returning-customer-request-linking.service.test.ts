import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, PropertyType } from "../../generated/prisma/client";
import type { ValidatedCleaningRequestCommand } from "../cleaning-request-validation.service";
import { createCleaningRequest, type CleaningRequestCreationOptions } from "../cleaning-request.service";

const command: ValidatedCleaningRequestCommand = {
  serviceId: "service-1", propertyType: PropertyType.HOUSE, bedrooms: 2, bathrooms: "1.5", extraIds: ["extra-1"],
  preferredDate: "2026-08-21", preferredTimeWindow: "MORNING", customerName: "Browser Name", customerEmail: "browser@example.com", customerPhone: "+19735551234",
  addressLine1: "Browser Address", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", customerNotes: "Browser note",
};

type Property = {
  id: string; customerId: string; isActive: boolean; addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string;
  propertyType: PropertyType; bedrooms: number | null; bathrooms: Prisma.Decimal | null; approximateSquareFeet: number | null;
};

function database() {
  const customer = { id: "customer-1", name: "Current Customer", email: "current@example.com", phone: "+19735550000", isActive: true };
  const property: Property = { id: "property-1", customerId: customer.id, isActive: true, addressLine1: "10 Saved Way", addressLine2: "Unit 2", city: "Jersey City", state: "NJ", postalCode: "07302", propertyType: PropertyType.APARTMENT, bedrooms: 3, bathrooms: new Prisma.Decimal("2.0"), approximateSquareFeet: 1400 };
  const requests: Array<Record<string, unknown>> = [];
  let nextId = 1;
  const database = {
    customer,
    property,
    requests,
    async $transaction<T>(callback: (transaction: Record<string, unknown>) => Promise<T>) {
      const before = requests.length;
      try {
        return await callback({
          cleaningRequest: {
            findMany: async () => requests.map((request) => ({ requestNumber: request.requestNumber as string })),
            create: async ({ data }: { data: Record<string, unknown> }) => {
              const request: Record<string, unknown> = { ...data, id: `request-${nextId++}` };
              requests.push(request);
              return { id: request.id as string, requestNumber: request.requestNumber as string, status: request.status as "NEW", estimateOutcome: request.estimateOutcome as never, estimatedPrice: request.estimatedPrice as Prisma.Decimal | null };
            },
          },
          customer: {
            findUnique: async () => database.customer.isActive ? { id: database.customer.id, name: database.customer.name, email: database.customer.email, phone: database.customer.phone } : null,
          },
          customerProperty: {
            findUnique: async ({ where }: { where: { id: string; customerId: string; isActive: true } }) => database.property.id === where.id && database.property.customerId === where.customerId && database.property.isActive ? { ...database.property } : null,
          },
        });
      } catch (error) {
        requests.splice(before);
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
    businessNotificationEnv: {},
    ...overrides,
  };
}

test("links a verified customer's saved property and persists authoritative snapshots", async () => {
  const db = database();
  const result = await createCleaningRequest({ savedPropertyId: "property-1", customerName: "Tampered", customerEmail: "tampered@example.com", addressLine1: "Tampered Address" }, optionsFor(db, { returningCustomerContext: { customerId: "customer-1" } }));
  assert.equal(result.success, true);
  assert.equal(db.requests[0].customerId, "customer-1");
  assert.equal(db.requests[0].customerPropertyId, "property-1");
  assert.equal(db.requests[0].customerName, "Current Customer");
  assert.equal(db.requests[0].customerEmail, "current@example.com");
  assert.equal(db.requests[0].customerPhone, "+19735550000");
  assert.equal(db.requests[0].addressLine1, "10 Saved Way");
  assert.equal(db.requests[0].propertyType, PropertyType.APARTMENT);
  assert.equal(db.requests[0].bedrooms, 3);
  assert.equal((db.requests[0].bathrooms as Prisma.Decimal).toFixed(1), "2.0");
  assert.equal(db.requests[0].approximateSquareFeet, 1400);

  db.customer.name = "Changed Later";
  db.property.addressLine1 = "Changed Property Later";
  assert.equal(db.requests[0].customerName, "Current Customer");
  assert.equal(db.requests[0].addressLine1, "10 Saved Way");
});

test("links a verified customer without a property relation when they enter a different property", async () => {
  const db = database();
  const result = await createCleaningRequest({}, optionsFor(db, { returningCustomerContext: { customerId: "customer-1" } }));
  assert.equal(result.success, true);
  assert.equal(db.requests[0].customerId, "customer-1");
  assert.equal(db.requests[0].customerPropertyId, null);
  assert.equal(db.requests[0].customerName, "Current Customer");
  assert.equal(db.requests[0].addressLine1, "Browser Address");
});

test("rejects a saved property without verified state, across customers, or when inactive", async () => {
  const noVerification = await createCleaningRequest({ savedPropertyId: "property-1" }, optionsFor(database()));
  assert.deepEqual(noVerification, { success: false, reason: "RETURNING_CUSTOMER_VERIFICATION_REQUIRED" });

  const crossCustomer = database();
  crossCustomer.property.customerId = "customer-2";
  const crossCustomerResult = await createCleaningRequest({ savedPropertyId: "property-1" }, optionsFor(crossCustomer, { returningCustomerContext: { customerId: "customer-1" } }));
  assert.deepEqual(crossCustomerResult, { success: false, reason: "RETURNING_CUSTOMER_PROPERTY_INVALID" });

  const inactiveProperty = database();
  inactiveProperty.property.isActive = false;
  const inactivePropertyResult = await createCleaningRequest({ savedPropertyId: "property-1" }, optionsFor(inactiveProperty, { returningCustomerContext: { customerId: "customer-1" } }));
  assert.deepEqual(inactivePropertyResult, { success: false, reason: "RETURNING_CUSTOMER_PROPERTY_INVALID" });
  assert.equal(inactiveProperty.requests.length, 0);
});

test("rechecks the customer active state and leaves ordinary submissions unlinked", async () => {
  const inactiveCustomer = database();
  inactiveCustomer.customer.isActive = false;
  const linked = await createCleaningRequest({}, optionsFor(inactiveCustomer, { returningCustomerContext: { customerId: "customer-1" } }));
  assert.deepEqual(linked, { success: false, reason: "RETURNING_CUSTOMER_VERIFICATION_REQUIRED" });

  const ordinary = database();
  const unverified = await createCleaningRequest({}, optionsFor(ordinary));
  assert.equal(unverified.success, true);
  assert.equal(ordinary.requests[0].customerId, null);
  assert.equal(ordinary.requests[0].customerPropertyId, null);
  assert.equal(ordinary.requests[0].customerName, "Browser Name");
});
