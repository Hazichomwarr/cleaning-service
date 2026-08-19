import assert from "node:assert/strict";
import test from "node:test";
import { CleaningEstimateOutcome, CleaningRequestStatus, Prisma, PropertyType, WorkerType } from "../../generated/prisma/client.js";
import { getAdminCleaningRequestDetail, type AdminCleaningRequestDetail } from "../admin-cleaning-request-detail.service.js";

function row(overrides: Partial<AdminCleaningRequestDetail> = {}) {
  const statusHistory = overrides.statusHistory ?? [];
  const item = {
    id: overrides.id ?? "request-1", requestNumber: overrides.requestNumber ?? "JC-2026-0042", status: overrides.status ?? CleaningRequestStatus.NEW,
    customer: overrides.customer ?? { name: "Jane Smith", email: "jane@example.com", phone: "+19735551234" },
    service: overrides.service ?? { id: "service-1", name: "Deep Cleaning", slug: "deep-cleaning" },
    property: overrides.property ?? { type: PropertyType.HOUSE, bedrooms: 2, bathrooms: "1.5", approximateSquareFeet: 1800 },
    address: overrides.address ?? { line1: "123 Main St", line2: "Apt 4B", city: "Newark", state: "NJ", postalCode: "07102" },
    extras: overrides.extras ?? [{ id: "extra-1", name: "Inside Oven" }, { id: "extra-2", name: "Interior Windows" }],
    customerNotes: overrides.customerNotes === undefined ? "Please call on arrival." : overrides.customerNotes,
    internalNotes: overrides.internalNotes === undefined ? "Preferred customer." : overrides.internalNotes,
    estimate: overrides.estimate ?? { outcome: CleaningEstimateOutcome.AUTOMATIC_ESTIMATE, estimatedPrice: "200.00", confirmedPrice: null },
    preferredSchedule: overrides.preferredSchedule ?? { date: "2026-08-21", timeWindow: "MORNING" },
    confirmedSchedule: overrides.confirmedSchedule ?? null,
    assignments: overrides.assignments ?? [],
    statusHistory,
    priceHistory: overrides.priceHistory ?? [],
    scheduleHistory: overrides.scheduleHistory ?? [],
    cancellation: overrides.cancellation ?? null,
    createdAt: overrides.createdAt ?? "2026-08-12T16:20:00.000Z", updatedAt: overrides.updatedAt ?? "2026-08-12T16:20:00.000Z",
  };
  return {
    id: item.id, requestNumber: item.requestNumber, status: item.status, customerName: item.customer.name, customerEmail: item.customer.email, customerPhone: item.customer.phone,
    propertyType: item.property.type, bedrooms: item.property.bedrooms, bathrooms: item.property.bathrooms === null ? null : new Prisma.Decimal(item.property.bathrooms), approximateSquareFeet: item.property.approximateSquareFeet,
    addressLine1: item.address.line1, addressLine2: item.address.line2, city: item.address.city, state: item.address.state, postalCode: item.address.postalCode,
    preferredDate: new Date(`${item.preferredSchedule.date}T00:00:00.000Z`), preferredTimeWindow: item.preferredSchedule.timeWindow,
    estimatedPrice: item.estimate.estimatedPrice === null ? null : new Prisma.Decimal(item.estimate.estimatedPrice), estimateOutcome: item.estimate.outcome, confirmedPrice: item.estimate.confirmedPrice === null ? null : new Prisma.Decimal(item.estimate.confirmedPrice),
    scheduledStart: item.confirmedSchedule?.start ? new Date(item.confirmedSchedule.start) : null, scheduledEnd: item.confirmedSchedule?.end ? new Date(item.confirmedSchedule.end) : null,
    customerNotes: item.customerNotes, internalNotes: item.internalNotes, cancelledAt: item.cancellation?.cancelledAt ? new Date(item.cancellation.cancelledAt) : null, cancellationReason: item.cancellation?.reason ?? null,
    createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt), service: item.service,
    requestExtras: item.extras.map((extra, index) => ({ cleaningExtra: { id: extra.id, name: extra.name, displayOrder: item.extras.length - index } })),
    assignments: item.assignments.map((assignment) => { const [firstName, ...lastParts] = assignment.workerName.split(" "); return { id: assignment.id, workerId: assignment.workerId, assignedAt: new Date(assignment.assignedAt), worker: { firstName, lastName: lastParts.join(" "), type: assignment.workerType } }; }),
    statusHistory: item.statusHistory.map((history) => ({ id: history.id, fromStatus: history.fromStatus, toStatus: history.toStatus, reason: history.reason, createdAt: new Date(history.changedAt), changedByAdminUser: history.changedBy })),
    priceHistory: item.priceHistory.map((history) => ({ id: history.id, previousConfirmedPrice: history.previousConfirmedPrice === null ? null : new Prisma.Decimal(history.previousConfirmedPrice), newConfirmedPrice: new Prisma.Decimal(history.newConfirmedPrice), reason: history.reason, createdAt: new Date(history.changedAt), changedByAdminUser: history.changedBy })),
    scheduleHistory: item.scheduleHistory.map((history) => ({ id: history.id, previousScheduledStart: history.previousScheduledStart ? new Date(history.previousScheduledStart) : null, previousScheduledEnd: history.previousScheduledEnd ? new Date(history.previousScheduledEnd) : null, newScheduledStart: new Date(history.newScheduledStart), newScheduledEnd: history.newScheduledEnd ? new Date(history.newScheduledEnd) : null, reason: history.reason, createdAt: new Date(history.changedAt), changedByAdminUser: history.changedBy })),
  };
}

function database(value: ReturnType<typeof row> | null) {
  return { cleaningRequest: { async findUnique() { return value; } } };
}

test("maps a full residential request without collapsing historical fields", async () => {
  const result = await getAdminCleaningRequestDetail("request-1", { database: database(row()) });
  assert.equal(result?.service.name, "Deep Cleaning");
  assert.deepEqual(result?.property, { type: PropertyType.HOUSE, bedrooms: 2, bathrooms: "1.5", approximateSquareFeet: 1800 });
  assert.deepEqual(result?.extras.map((extra) => extra.name), ["Interior Windows", "Inside Oven"]);
  assert.equal(result?.estimate.estimatedPrice, "200.00");
  assert.equal(result?.estimate.confirmedPrice, null);
  assert.deepEqual(result?.preferredSchedule, { date: "2026-08-21", timeWindow: "MORNING" });
  assert.equal(result?.confirmedSchedule, null);
  assert.equal(result?.customerNotes, "Please call on arrival.");
  assert.equal(result?.internalNotes, "Preferred customer.");
});

test("preserves commercial manual pricing and confirmed schedule separately", async () => {
  const result = await getAdminCleaningRequestDetail("request-1", { database: database(row({ property: { type: PropertyType.OFFICE, bedrooms: null, bathrooms: null, approximateSquareFeet: 3000 }, estimate: { outcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, estimatedPrice: null, confirmedPrice: "650.00" }, confirmedSchedule: { start: "2026-08-21T17:00:00.000Z", end: "2026-08-21T19:00:00.000Z" } })) });
  assert.equal(result?.property.bedrooms, null);
  assert.equal(result?.estimate.estimatedPrice, null);
  assert.equal(result?.estimate.confirmedPrice, "650.00");
  assert.deepEqual(result?.confirmedSchedule, { start: "2026-08-21T17:00:00.000Z", end: "2026-08-21T19:00:00.000Z" });
});

test("supports multiple assignments and contractor labels", async () => {
  const result = await getAdminCleaningRequestDetail("request-1", { database: database(row({ assignments: [
    { id: "assignment-2", workerId: "worker-2", workerName: "Rosa Diaz", workerType: WorkerType.CREW, assignedAt: "2026-08-20T13:15:00.000Z" },
    { id: "assignment-1", workerId: "worker-1", workerName: "Maria Lopez", workerType: WorkerType.CONTRACTOR, assignedAt: "2026-08-20T13:00:00.000Z" },
  ] })) });
  assert.deepEqual(result?.assignments.map((assignment) => [assignment.workerName, assignment.workerType]), [["Maria Lopez", WorkerType.CONTRACTOR], ["Rosa Diaz", WorkerType.CREW]]);
});

test("maps cancellation and partial schedules without inventing values", async () => {
  const result = await getAdminCleaningRequestDetail("request-1", { database: database(row({ status: CleaningRequestStatus.CANCELLED, cancellation: { cancelledAt: "2026-08-13T14:00:00.000Z", reason: null }, confirmedSchedule: { start: "2026-08-21T17:00:00.000Z", end: null } })) });
  assert.deepEqual(result?.cancellation, { cancelledAt: "2026-08-13T14:00:00.000Z", reason: null });
  assert.deepEqual(result?.confirmedSchedule, { start: "2026-08-21T17:00:00.000Z", end: null });
});

test("returns null for an unknown request and keeps empty collections safe", async () => {
  assert.equal(await getAdminCleaningRequestDetail("missing", { database: database(null) }), null);
  const result = await getAdminCleaningRequestDetail("request-1", { database: database(row({ extras: [], assignments: [], customerNotes: null, internalNotes: null })) });
  assert.deepEqual(result?.extras, []);
  assert.deepEqual(result?.assignments, []);
  assert.equal(result?.cancellation, null);
});

test("serializes lifecycle history oldest first with safe actor fields", async () => {
  const result = await getAdminCleaningRequestDetail("request-1", { database: database(row({ statusHistory: [
    { id: "history-2", fromStatus: CleaningRequestStatus.REVIEWING, toStatus: CleaningRequestStatus.CANCELLED, reason: "Unavailable", changedAt: "2026-08-14T12:00:00.000Z", changedBy: { id: "admin-2", name: "Maria Rodriguez", email: "maria@example.com" } },
    { id: "history-1", fromStatus: CleaningRequestStatus.NEW, toStatus: CleaningRequestStatus.REVIEWING, reason: null, changedAt: "2026-08-13T12:00:00.000Z", changedBy: { id: "admin-1", name: "John Smith", email: "john@example.com" } },
  ] })) });
  assert.deepEqual(result?.statusHistory.map((item) => item.id), ["history-1", "history-2"]);
  assert.deepEqual(result?.statusHistory[0]?.changedBy, { id: "admin-1", name: "John Smith", email: "john@example.com" });
  assert.equal(result?.statusHistory[0]?.reason, null);
  assert.equal("passwordHash" in (result?.statusHistory[0]?.changedBy ?? {}), false);
});

test("serializes price history oldest first without fabricating legacy rows", async () => {
  const result = await getAdminCleaningRequestDetail("request-1", { database: database(row({ estimate: { outcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, estimatedPrice: null, confirmedPrice: "250.00" }, priceHistory: [
    { id: "price-2", previousConfirmedPrice: "250.00", newConfirmedPrice: "275.50", reason: "Scope changed", changedAt: "2026-08-14T12:00:00.000Z", changedBy: { id: "admin-2", name: "Maria Rodriguez", email: "maria@example.com" } },
    { id: "price-1", previousConfirmedPrice: null, newConfirmedPrice: "250.00", reason: null, changedAt: "2026-08-13T12:00:00.000Z", changedBy: { id: "admin-1", name: "John Smith", email: "john@example.com" } },
  ] })) });
  assert.deepEqual(result?.priceHistory.map((item) => item.id), ["price-1", "price-2"]);
  assert.deepEqual(result?.priceHistory[0], { id: "price-1", previousConfirmedPrice: null, newConfirmedPrice: "250.00", reason: null, changedAt: "2026-08-13T12:00:00.000Z", changedBy: { id: "admin-1", name: "John Smith", email: "john@example.com" } });
});

test("serializes schedule history oldest first without fabricating legacy rows", async () => {
  const result = await getAdminCleaningRequestDetail("request-1", { database: database(row({ confirmedSchedule: { start: "2026-08-16T14:00:00.000Z", end: "2026-08-16T16:00:00.000Z" }, scheduleHistory: [
    { id: "schedule-2", previousScheduledStart: "2026-08-16T14:00:00.000Z", previousScheduledEnd: "2026-08-16T16:00:00.000Z", newScheduledStart: "2026-08-17T17:00:00.000Z", newScheduledEnd: "2026-08-17T19:00:00.000Z", reason: "Customer requested change", changedAt: "2026-08-14T12:00:00.000Z", changedBy: { id: "admin-2", name: "Maria Rodriguez", email: "maria@example.com" } },
    { id: "schedule-1", previousScheduledStart: null, previousScheduledEnd: null, newScheduledStart: "2026-08-16T14:00:00.000Z", newScheduledEnd: "2026-08-16T16:00:00.000Z", reason: null, changedAt: "2026-08-13T12:00:00.000Z", changedBy: { id: "admin-1", name: "John Smith", email: "john@example.com" } },
  ] })) });
  assert.deepEqual(result?.scheduleHistory.map((item) => item.id), ["schedule-1", "schedule-2"]);
  assert.equal(result?.scheduleHistory[0]?.previousScheduledStart, null);
  assert.equal("passwordHash" in (result?.scheduleHistory[0]?.changedBy ?? {}), false);
});
