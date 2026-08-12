import assert from "node:assert/strict";
import test from "node:test";
import { CleaningEstimateOutcome, CleaningRequestStatus, Prisma, PropertyType } from "../../generated/prisma/client.js";
import { parseAdminCleaningRequestsQuery } from "../../lib/admin-cleaning-requests-query.js";
import { getAdminCleaningRequests, type AdminCleaningRequestListItem } from "../admin-cleaning-requests.service.js";

function row(overrides: Partial<AdminCleaningRequestListItem> = {}) {
  const item = {
    id: overrides.id ?? "request-1",
    requestNumber: overrides.requestNumber ?? "JC-2026-0001",
    customerName: overrides.customerName ?? "Jane Smith",
    serviceName: overrides.serviceName ?? "Deep Cleaning",
    propertyType: overrides.propertyType ?? PropertyType.HOUSE,
    status: overrides.status ?? CleaningRequestStatus.NEW,
    estimateOutcome: overrides.estimateOutcome ?? CleaningEstimateOutcome.AUTOMATIC_ESTIMATE,
    estimatedPrice: overrides.estimatedPrice === undefined ? "200.00" : overrides.estimatedPrice,
    preferredDate: overrides.preferredDate ?? "2026-08-21",
    preferredTimeWindow: overrides.preferredTimeWindow ?? "MORNING",
    scheduledStart: overrides.scheduledStart ?? null,
    createdAt: overrides.createdAt ?? "2026-08-12T16:20:00.000Z",
  };
  return {
    ...item,
    estimatedPrice: item.estimatedPrice === null ? null : new Prisma.Decimal(item.estimatedPrice),
    preferredDate: new Date(`${item.preferredDate}T00:00:00.000Z`),
    scheduledStart: item.scheduledStart ? new Date(item.scheduledStart) : null,
    createdAt: new Date(item.createdAt),
    service: { name: item.serviceName },
  };
}

function matchesWhere(item: ReturnType<typeof row>, where: Record<string, unknown>): boolean {
  const conditions = (where.AND as Array<Record<string, unknown>> | undefined) ?? [];
  return conditions.every((condition) => {
    if (condition.status) return item.status === condition.status;
    if (condition.estimateOutcome) return (condition.estimateOutcome as { in: string[] }).in.includes(item.estimateOutcome);
    if (condition.OR) return (condition.OR as Array<Record<string, unknown>>).some((search) => {
      const field = Object.keys(search)[0];
      const value = (search[field] as { contains: string }).contains;
      const candidate = field === "customerEmail"
        ? item.customerName === "Jane Smith" ? "jane@example.com" : ""
        : field === "customerPhone" ? item.id === "phone" ? "+19735551234" : ""
        : String(item[field as keyof typeof item] ?? "");
      return candidate.toLowerCase().includes(value.toLowerCase());
    });
    return true;
  });
}

function database(rows: ReturnType<typeof row>[]) {
  return {
    cleaningRequest: {
      async count({ where }: { where: Record<string, unknown> }) {
        return rows.filter((item) => matchesWhere(item, where)).length;
      },
      async findMany({ where, skip, take }: { where: Record<string, unknown>; select: Record<string, unknown>; orderBy: Array<Record<string, string>>; skip: number; take: number }) {
        return rows.filter((item) => matchesWhere(item, where)).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id)).slice(skip, skip + take);
      },
    },
  };
}

test("normalizes missing, invalid, whitespace, status, attention, and page query values", () => {
  assert.deepEqual(parseAdminCleaningRequestsQuery(), { search: "", status: undefined, estimateAttention: false, page: 1 });
  assert.deepEqual(parseAdminCleaningRequestsQuery({ search: "  Jane  ", status: "new", estimateAttention: "true", page: "0" }), { search: "Jane", status: CleaningRequestStatus.NEW, estimateAttention: true, page: 1 });
  assert.deepEqual(parseAdminCleaningRequestsQuery({ status: "UNKNOWN", estimateAttention: "false", page: "2.5" }), { search: "", status: undefined, estimateAttention: false, page: 1 });
});

test("composes request search, status, and estimate attention with AND semantics", async () => {
  const result = await getAdminCleaningRequests(parseAdminCleaningRequestsQuery({ search: "jane", status: "NEW", estimateAttention: "true" }), { database: database([
    row({ id: "match", customerName: "Jane Smith", status: CleaningRequestStatus.NEW, estimateOutcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, estimatedPrice: null }),
    row({ id: "automatic", customerName: "Jane Smith", status: CleaningRequestStatus.NEW }),
    row({ id: "reviewing", customerName: "Jane Smith", status: CleaningRequestStatus.REVIEWING, estimateOutcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, estimatedPrice: null }),
    row({ id: "other-name", customerName: "Alex Smith", status: CleaningRequestStatus.NEW, estimateOutcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, estimatedPrice: null }),
  ]) });
  assert.deepEqual(result.items.map((item) => item.id), ["match"]);
});

test("searches request number, customer name, email-compatible input, and normalized phone", async () => {
  const result = await getAdminCleaningRequests(parseAdminCleaningRequestsQuery({ search: "JC-2026-0042" }), { database: database([row({ id: "found", requestNumber: "JC-2026-0042" }), row({ id: "other" })]) });
  assert.deepEqual(result.items.map((item) => item.id), ["found"]);
  const emailResult = await getAdminCleaningRequests(parseAdminCleaningRequestsQuery({ search: "jane@example.com" }), { database: database([row({ id: "email", customerName: "Jane Smith" }), row({ id: "other", customerName: "Other" })]) });
  assert.deepEqual(emailResult.items.map((item) => item.id), ["email"]);
  const phoneResult = await getAdminCleaningRequests(parseAdminCleaningRequestsQuery({ search: "(973) 555-1234" }), { database: database([row({ id: "phone" }), row({ id: "other", customerName: "Other" })]) });
  assert.deepEqual(phoneResult.items.map((item) => item.id), ["phone"]);
});

test("paginates newest-first with stable secondary ordering and clamps out-of-range pages", async () => {
  const rows = [
    row({ id: "a", createdAt: "2026-08-12T16:00:00.000Z" }),
    row({ id: "b", createdAt: "2026-08-12T16:00:00.000Z" }),
    row({ id: "c", createdAt: "2026-08-11T16:00:00.000Z" }),
  ];
  const pageOne = await getAdminCleaningRequests(parseAdminCleaningRequestsQuery({ page: "1" }), { database: database(rows), pageSize: 2 });
  const pageTwo = await getAdminCleaningRequests(parseAdminCleaningRequestsQuery({ page: "2" }), { database: database(rows), pageSize: 2 });
  const page999 = await getAdminCleaningRequests(parseAdminCleaningRequestsQuery({ page: "999" }), { database: database(rows), pageSize: 2 });
  assert.deepEqual(pageOne.items.map((item) => item.id), ["b", "a"]);
  assert.deepEqual(pageTwo.items.map((item) => item.id), ["c"]);
  assert.deepEqual(page999.items.map((item) => item.id), ["c"]);
  assert.deepEqual(page999.pagination, { page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
});

test("keeps cancelled history, serializes estimates safely, and omits private fields", async () => {
  const result = await getAdminCleaningRequests(parseAdminCleaningRequestsQuery({ status: "CANCELLED" }), { database: database([row({ id: "cancelled", status: CleaningRequestStatus.CANCELLED, estimatedPrice: null, estimateOutcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED })]) });
  assert.equal(result.items[0]?.status, CleaningRequestStatus.CANCELLED);
  assert.equal(result.items[0]?.estimatedPrice, null);
  assert.equal(result.items[0]?.preferredDate, "2026-08-21");
  assert.equal("customerEmail" in (result.items[0] ?? {}), false);
  assert.equal("customerPhone" in (result.items[0] ?? {}), false);
  assert.equal("addressLine1" in (result.items[0] ?? {}), false);
  assert.equal("customerNotes" in (result.items[0] ?? {}), false);
  assert.equal("internalNotes" in (result.items[0] ?? {}), false);
});
