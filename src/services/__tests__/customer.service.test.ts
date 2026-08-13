import assert from "node:assert/strict";
import test from "node:test";
import { createCustomer } from "../customer.service.js";

const base = { name: " Jane Smith ", email: " JANE@EXAMPLE.COM ", phone: "(973) 555-1234" };
function database(existing: { id: string; name: string; email: string | null; phone: string | null } | null = null) {
  const calls: unknown[] = [];
  return { calls, customer: { async findFirst() { return existing; }, async create(args: { data: { name: string; email: string | null; phone: string | null; properties?: unknown } }) { calls.push(args); return { id: "new", name: args.data.name, email: args.data.email, phone: args.data.phone, properties: args.data.properties ? [{ id: "property-1" }] : [] }; } } };
}

test("normalizes valid phone and email and accepts a phone-only customer", async () => {
  const db = database();
  const result = await createCustomer(base, { database: db as never });
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.customer.email, "jane@example.com");
  assert.equal(result.customer.phone, "+19735551234");
  const phoneOnly = await createCustomer({ name: "Phone Only", phone: "9735551234" }, { database: database() as never });
  assert.equal(phoneOnly.status, "SUCCESS");
});

test("rejects missing contact, strict fields, and invalid phone", async () => {
  assert.equal((await createCustomer({ name: "No Contact" }, { database: database() as never })).status, "INVALID_INPUT");
  assert.equal((await createCustomer({ ...base, unexpected: true }, { database: database() as never })).status, "INVALID_INPUT");
  assert.equal((await createCustomer({ name: "Bad Phone", phone: "123" }, { database: database() as never })).status, "INVALID_INPUT");
});

test("warns on exact duplicate contact and creates only after explicit override", async () => {
  const existing = { id: "old", name: "Existing", email: "jane@example.com", phone: "+19735551234" };
  const warning = await createCustomer(base, { database: database(existing) as never });
  assert.equal(warning.status, "POSSIBLE_DUPLICATE");
  const db = database(existing);
  const created = await createCustomer({ ...base, allowDuplicateContact: true }, { database: db as never });
  assert.equal(created.status, "SUCCESS");
  assert.equal(db.calls.length, 1);
});

test("creates an optional initial property and normalizes irrelevant bedrooms", async () => {
  const db = database();
  const result = await createCustomer({ name: "Office Customer", email: "office@example.com", property: { propertyType: "OFFICE", addressLine1: "1 Main St", city: "Newark", state: "nj", postalCode: "07102", bedrooms: 3, bathrooms: 1.5 } }, { database: db as never });
  assert.equal(result.status, "SUCCESS");
  const property = (db.calls[0] as { data: { properties: { create: { bedrooms: number | null; bathrooms: string | null } } } }).data.properties.create;
  assert.equal(property.bedrooms, null);
  assert.equal(property.bathrooms, "1.5");
});
