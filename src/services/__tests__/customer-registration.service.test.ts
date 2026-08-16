import assert from "node:assert/strict";
import test from "node:test";
import { PropertyType } from "../../generated/prisma/client";
import { createCustomerForNewRequestIfSafe } from "../customer-registration.service.js";
import type { ValidatedCleaningRequestCommand } from "../cleaning-request-validation.service.js";

const command: ValidatedCleaningRequestCommand = {
  serviceId: "service-1", propertyType: PropertyType.HOUSE, bedrooms: 2, bathrooms: null, extraIds: [],
  preferredDate: "2026-08-21", preferredTimeWindow: "MORNING", customerName: "Jane Smith", customerEmail: "Jane@Example.COM", customerPhone: "(973) 555-1234",
  addressLine1: "123 Main St", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", customerNotes: null,
};

function transaction(initial: Array<{ id: string; isActive: boolean }> = []) {
  const customers = [...initial];
  const locks: unknown[] = [];
  const tx = {
    locks,
    customer: {
      async findMany() { return customers; },
      async create({ data }: { data: Record<string, unknown> }) {
        const customer = { id: `customer-${customers.length + 1}`, isActive: true };
        customers.push(customer);
        assert.equal(data.name, "Jane Smith");
        assert.equal(data.email, "jane@example.com");
        assert.equal(data.phone, "+19735551234");
        assert.equal(data.isActive, true);
        return { id: customer.id };
      },
    },
    async $queryRaw(query: unknown) { locks.push(query); },
  };
  return tx;
}

test("creates a normalized active Customer for a no-match identity", async () => {
  const tx = transaction();
  assert.equal(await createCustomerForNewRequestIfSafe(tx, command), "customer-1");
  assert.equal(tx.locks.length, 2);
});

test("treats active and inactive identity collisions as non-creation outcomes", async () => {
  for (const existing of [
    [{ id: "active", isActive: true }],
    [{ id: "inactive", isActive: false }],
  ]) {
    const tx = transaction(existing);
    assert.equal(await createCustomerForNewRequestIfSafe(tx, command), null);
    assert.equal(tx.customer.findMany !== undefined, true);
  }
});

test("locks every normalized identity field before checking for candidates", async () => {
  const tx = transaction();
  await createCustomerForNewRequestIfSafe(tx, command);
  assert.equal(tx.locks.length, 2);
});
