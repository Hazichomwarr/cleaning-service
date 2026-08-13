import assert from "node:assert/strict";
import test from "node:test";
import { getAdminCustomers } from "../admin-customers.service.js";
import { parseAdminCustomersQuery } from "../../lib/admin-customers-query.js";

function row(id: string, name: string, overrides: Partial<{ email: string | null; phone: string | null; isActive: boolean; properties: number; requests: number }> = {}) {
  return { id, name, email: overrides.email ?? `${id}@example.com`, phone: overrides.phone ?? "+19735551234", isActive: overrides.isActive ?? true, _count: { properties: overrides.properties ?? 1, requests: overrides.requests ?? 0 } };
}
function database(rows: ReturnType<typeof row>[]) { return { customer: { async count({ where }: { where: { OR?: Array<{ name?: { contains: string } }> } }) { const term = where.OR?.[0]?.name?.contains?.toLowerCase(); return term ? rows.filter((item) => JSON.stringify(item).toLowerCase().includes(term)).length : rows.length; }, async findMany(args: { skip: number; take: number }) { return rows.slice().sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).slice(args.skip, args.skip + args.take); } } }; }

test("parses customer search and pagination safely", () => {
  assert.deepEqual(parseAdminCustomersQuery(), { search: "", page: 1 });
  assert.deepEqual(parseAdminCustomersQuery({ search: "  Jane ", page: "2" }), { search: "Jane", page: 2 });
  assert.deepEqual(parseAdminCustomersQuery({ page: "0.5" }), { search: "", page: 1 });
});

test("returns deterministic alphabetical pages with safe counts and inactive customers", async () => {
  const rows = [row("b", "Jane Smith", { requests: 3, properties: 2 }), row("a", "Jane Smith", { isActive: false, requests: 0, properties: 5 }), ...Array.from({ length: 20 }, (_, index) => row(`z${index}`, `Other ${index}`, { properties: 0 }))];
  const result = await getAdminCustomers(parseAdminCustomersQuery({ page: "2" }), { database: database(rows) as never, pageSize: 20 });
  assert.equal(result.pagination.totalItems, 22);
  assert.equal(result.pagination.page, 2);
  assert.equal(result.items[0]?.name, "Other 8");
  assert.equal(result.items.find((item) => item.id === "a"), undefined);
  const first = await getAdminCustomers(parseAdminCustomersQuery(), { database: database(rows) as never, pageSize: 20 });
  assert.deepEqual(first.items.slice(0, 2).map((item) => item.id), ["a", "b"]);
  assert.deepEqual(first.items.find((item) => item.id === "b"), { id: "b", name: "Jane Smith", email: "b@example.com", phone: "+19735551234", isActive: true, propertyCount: 2, requestCount: 3 });
});
