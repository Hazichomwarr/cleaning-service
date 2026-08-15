/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import { matchExistingCustomer } from "../customer-matching.service.js";

type Row = { id: string; email: string | null; phone: string | null; isActive: boolean };
function database(rows: Row[]) {
  const calls: any[] = [];
  return { calls, database: { customer: { async findMany(args: any) { calls.push(args); return rows.filter((row) => row.isActive && args.where.OR.some((condition: any) => (condition.email && condition.email === row.email) || (condition.phone && condition.phone === row.phone))).slice(0, args.take); } } } as any };
}

test("matches a unique normalized email and returns only the customer id", async () => {
  const f = database([{ id: "customer-a", email: "jane@example.com", phone: null, isActive: true }]);
  assert.deepEqual(await matchExistingCustomer({ email: "  JANE@EXAMPLE.COM  " }, { database: f.database }), { outcome: "MATCHED", customer: { id: "customer-a" } });
  assert.deepEqual(f.calls[0].select, { id: true });
  assert.equal("properties" in f.calls[0].select, false);
});

test("matches normalized phone, email-only, phone-only, and same-customer evidence", async () => {
  const row = { id: "customer-a", email: "jane@example.com", phone: "+19735551111", isActive: true };
  assert.equal((await matchExistingCustomer({ phone: "(973) 555-1111" }, { database: database([row]).database })).outcome, "MATCHED");
  assert.equal((await matchExistingCustomer({ email: "jane@example.com", phone: "(973) 555-2222" }, { database: database([row]).database })).outcome, "MATCHED");
  assert.equal((await matchExistingCustomer({ email: "jane@example.com", phone: "(973) 555-1111" }, { database: database([row]).database })).outcome, "MATCHED");
});

test("returns no match when one usable identifier is unmatched and no candidate exists", async () => {
  const f = database([{ id: "customer-a", email: "jane@example.com", phone: null, isActive: true }]);
  assert.equal((await matchExistingCustomer({ email: "nobody@example.com", phone: "(973) 555-2222" }, { database: f.database })).outcome, "NO_MATCH");
});

test("returns ambiguous for conflicts and duplicate active identities", async () => {
  assert.equal((await matchExistingCustomer({ email: "a@example.com", phone: "(973) 555-2222" }, { database: database([{ id: "a", email: "a@example.com", phone: null, isActive: true }, { id: "b", email: null, phone: "+19735552222", isActive: true }]).database })).outcome, "AMBIGUOUS");
  assert.equal((await matchExistingCustomer({ email: "a@example.com" }, { database: database([{ id: "a", email: "a@example.com", phone: null, isActive: true }, { id: "b", email: "a@example.com", phone: null, isActive: true }]).database })).outcome, "AMBIGUOUS");
  assert.equal((await matchExistingCustomer({ phone: "(973) 555-2222" }, { database: database([{ id: "a", email: null, phone: "+19735552222", isActive: true }, { id: "b", email: null, phone: "+19735552222", isActive: true }]).database })).outcome, "AMBIGUOUS");
});

test("ignores inactive customers and never uses name or address as identity", async () => {
  const f = database([{ id: "inactive", email: "jane@example.com", phone: null, isActive: false }]);
  assert.equal((await matchExistingCustomer({ email: "jane@example.com" }, { database: f.database })).outcome, "NO_MATCH");
  assert.equal((await matchExistingCustomer({ name: "Jane Doe", addressLine1: "123 Main Street" }, { database: f.database })).outcome, "INVALID_INPUT");
});

test("rejects invalid, empty, whitespace, and fuzzy contact input without querying", async () => {
  for (const input of [{ email: "not-an-email" }, { phone: "123" }, { email: " ", phone: " " }, { email: "jan@example.com" }]) {
    const f = database([{ id: "customer-a", email: "jane@example.com", phone: "+19735551111", isActive: true }]);
    const result = await matchExistingCustomer(input, { database: f.database });
    assert.ok(result.outcome === "INVALID_INPUT" || result.outcome === "NO_MATCH");
    if (input.email !== "jan@example.com") assert.equal(f.calls.length, 0);
  }
});
