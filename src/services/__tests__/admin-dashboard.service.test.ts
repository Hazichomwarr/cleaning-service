import assert from "node:assert/strict";
import test from "node:test";
import { CleaningEstimateOutcome, CleaningRequestStatus, Prisma, PropertyType } from "../../generated/prisma/client.js";
import { getAdminDashboardOverview, getBusinessDayBounds, type AdminDashboardRequestItem } from "../admin-dashboard.service.js";

const now = new Date("2026-08-12T16:00:00.000Z");

function row(overrides: Partial<AdminDashboardRequestItem> & { createdAt?: string } = {}) {
  const item = {
    id: overrides.id ?? "request-1",
    requestNumber: overrides.requestNumber ?? "JC-2026-0001",
    customerName: overrides.customerName ?? "Jane Smith",
    serviceName: overrides.serviceName ?? "Deep Cleaning",
    propertyType: overrides.propertyType ?? PropertyType.HOUSE,
    bedrooms: overrides.bedrooms ?? 2,
    status: overrides.status ?? CleaningRequestStatus.NEW,
    estimateOutcome: overrides.estimateOutcome ?? CleaningEstimateOutcome.AUTOMATIC_ESTIMATE,
    estimatedPrice: overrides.estimatedPrice === undefined ? "200.00" : overrides.estimatedPrice,
    preferredDate: overrides.preferredDate ?? "2026-08-12",
    preferredTimeWindow: overrides.preferredTimeWindow ?? "MORNING",
    scheduledStart: overrides.scheduledStart ?? null,
    scheduledEnd: overrides.scheduledEnd ?? null,
    createdAt: overrides.createdAt ?? "2026-08-12T12:00:00.000Z",
  };
  return {
    ...item,
    preferredDate: new Date(`${item.preferredDate}T00:00:00.000Z`),
    estimatedPrice: item.estimatedPrice === null ? null : new Prisma.Decimal(item.estimatedPrice),
    scheduledStart: item.scheduledStart ? new Date(item.scheduledStart) : null,
    scheduledEnd: item.scheduledEnd ? new Date(item.scheduledEnd) : null,
    createdAt: new Date(item.createdAt),
    service: { name: item.serviceName },
  };
}

function database(rows: ReturnType<typeof row>[]) {
  return {
    cleaningRequest: {
      async count({ where }: { where: Record<string, unknown> }) {
        if (where.status === CleaningRequestStatus.NEW) return rows.filter((item) => item.status === CleaningRequestStatus.NEW).length;
        const range = (where.scheduledStart as { gte?: Date; lt?: Date; } | undefined);
        if (!range) return 0;
        return rows.filter((item) => item.status !== CleaningRequestStatus.CANCELLED && item.scheduledStart && item.scheduledStart >= (range.gte ?? new Date(0)) && item.scheduledStart < (range.lt ?? new Date("9999-12-31"))).length;
      },
      async findMany({ where, orderBy, take }: { where: Record<string, unknown>; select: Record<string, unknown>; orderBy: Record<string, string>; take: number }) {
        let matching = rows.filter((item) => {
          if (where.status === CleaningRequestStatus.NEW) return item.status === CleaningRequestStatus.NEW;
          if (where.status === CleaningRequestStatus.REVIEWING) return item.status === CleaningRequestStatus.REVIEWING && new Set<CleaningEstimateOutcome>([CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, CleaningEstimateOutcome.NO_CONFIGURED_ESTIMATE, CleaningEstimateOutcome.ESTIMATE_UNAVAILABLE]).has(item.estimateOutcome);
          if (!where.scheduledStart) return true;
          const range = where.scheduledStart as { gte: Date; lt?: Date };
          return item.status !== CleaningRequestStatus.CANCELLED && item.scheduledStart !== null && item.scheduledStart >= range.gte && (!range.lt || item.scheduledStart < range.lt);
        });
        const field = Object.keys(orderBy)[0];
        matching = matching.sort((left, right) => {
          const leftValue = field === "scheduledStart" ? left.scheduledStart?.getTime() ?? 0 : left.createdAt.getTime();
          const rightValue = field === "scheduledStart" ? right.scheduledStart?.getTime() ?? 0 : right.createdAt.getTime();
          return orderBy[field] === "asc" ? leftValue - rightValue : rightValue - leftValue;
        });
        return matching.slice(0, take);
      },
    },
  };
}

test("counts NEW requests regardless of age and uses confirmed scheduled timestamps", async () => {
  const result = await getAdminDashboardOverview({
    now,
    database: database([
      row({ id: "old-new", status: CleaningRequestStatus.NEW, createdAt: "2026-08-11T12:00:00.000Z" }),
      row({ id: "reviewing", status: CleaningRequestStatus.REVIEWING }),
      row({ id: "today", status: CleaningRequestStatus.CONFIRMED, preferredDate: "2026-08-12", scheduledStart: "2026-08-12T14:00:00.000Z", scheduledEnd: "2026-08-12T15:00:00.000Z" }),
      row({ id: "cancelled", status: CleaningRequestStatus.CANCELLED, scheduledStart: "2026-08-12T15:00:00.000Z" }),
      row({ id: "completed", status: CleaningRequestStatus.COMPLETED, scheduledStart: "2026-08-12T18:00:00.000Z" }),
      row({ id: "tomorrow", status: CleaningRequestStatus.CONFIRMED, preferredDate: "2026-08-13", scheduledStart: "2026-08-13T14:00:00.000Z" }),
      row({ id: "preferred-only", status: CleaningRequestStatus.NEW, preferredDate: "2026-08-13" }),
    ]),
  });

  assert.deepEqual(result.counts, { newRequests: 2, todayScheduled: 2, upcomingScheduled: 1 });
  assert.equal(result.todaysCleanings.map((item) => item.id).join(","), "today,completed");
  assert.equal(result.recentRequests.length, 5);
});

test("uses New York calendar boundaries across a UTC date change", () => {
  const bounds = getBusinessDayBounds(new Date("2026-08-13T02:30:00.000Z"));
  assert.equal(bounds.start.toISOString(), "2026-08-12T04:00:00.000Z");
  assert.equal(bounds.end.toISOString(), "2026-08-13T04:00:00.000Z");
});

test("keeps DST-aware New York boundaries without a hardcoded offset", () => {
  const bounds = getBusinessDayBounds(new Date("2026-03-08T05:30:00.000Z"));
  assert.equal(bounds.start.toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(bounds.end.toISOString(), "2026-03-09T04:00:00.000Z");
});

test("orders attention with NEW first, oldest first, and limits the preview", async () => {
  const result = await getAdminDashboardOverview({
    now,
    previewLimit: 2,
    database: database([
      row({ id: "reviewing-old", status: CleaningRequestStatus.REVIEWING, estimateOutcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, createdAt: "2026-08-01T12:00:00.000Z" }),
      row({ id: "new-newer", status: CleaningRequestStatus.NEW, createdAt: "2026-08-03T12:00:00.000Z" }),
      row({ id: "new-older", status: CleaningRequestStatus.NEW, createdAt: "2026-08-02T12:00:00.000Z" }),
    ]),
  });
  assert.deepEqual(result.needsAttention.map((item) => item.id), ["new-older", "new-newer"]);
});

test("serializes estimates and keeps non-automatic estimates nullable", async () => {
  const result = await getAdminDashboardOverview({
    now,
    database: database([
      row({ id: "automatic", estimatedPrice: "200.00" }),
      row({ id: "manual", status: CleaningRequestStatus.REVIEWING, estimateOutcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, estimatedPrice: null }),
    ]),
  });
  const automatic = result.needsAttention.find((item) => item.id === "automatic");
  const manual = result.needsAttention.find((item) => item.id === "manual");
  assert.equal(automatic?.estimatedPrice, "200.00");
  assert.equal(manual?.estimatedPrice, null);
  assert.equal("customerEmail" in (automatic ?? {}), false);
  assert.equal("addressLine1" in (automatic ?? {}), false);
});
