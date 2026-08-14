import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CleaningRequestStatus, Prisma } from "../../generated/prisma/client";
import { confirmCleaningRequestForAdmin } from "../cleaning-request-confirmation.service";

function database(overrides: Partial<{ status: CleaningRequestStatus; confirmedPrice: Prisma.Decimal | null; scheduledStart: Date | null; scheduledEnd: Date | null; updateCount: number }> = {}) {
  const state = { id: "request-1", requestNumber: "CR-2030-0001", status: CleaningRequestStatus.REVIEWING, confirmedPrice: new Prisma.Decimal("250"), scheduledStart: new Date("2030-01-01T15:00:00Z"), scheduledEnd: new Date("2030-01-01T17:00:00Z"), updateCount: 1, ...overrides };
  const history: unknown[] = [];
  const transaction = { cleaningRequest: { findUnique: async () => ({ id: state.id, requestNumber: state.requestNumber, status: state.status, confirmedPrice: state.confirmedPrice, scheduledStart: state.scheduledStart, scheduledEnd: state.scheduledEnd }), updateMany: async () => { if (state.updateCount === 1) state.status = CleaningRequestStatus.CONFIRMED; return { count: state.updateCount }; } }, cleaningRequestStatusHistory: { create: async ({ data }: { data: unknown }) => { history.push(data); return { id: "history-1", fromStatus: CleaningRequestStatus.REVIEWING, toStatus: CleaningRequestStatus.CONFIRMED, reason: null, createdAt: new Date("2030-01-01T12:00:00Z") }; } } };
  return { state, history, database: { $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(transaction) } } as any;
}

describe("confirmCleaningRequestForAdmin", () => {
  it("confirms atomically and creates one lifecycle history row without changing facts", async () => {
    const fixture = database();
    const result = await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: fixture.database, now: new Date("2030-01-01T12:00:00Z") });
    assert.equal(result.success, true); assert.equal(fixture.state.status, CleaningRequestStatus.CONFIRMED); assert.equal(fixture.history.length, 1); assert.equal(fixture.state.confirmedPrice?.toString(), "250");
  });
  it("rejects missing prerequisites, wrong statuses, conflicts, and extra browser fields", async () => {
    for (const input of [{ cleaningRequestId: "request-1", confirmedPrice: "1" }, { cleaningRequestId: "request-1", scheduledStart: "x" }, { cleaningRequestId: "request-1", fromStatus: "REVIEWING" }]) assert.equal((await confirmCleaningRequestForAdmin("admin-1", input, { database: database().database }) as any).reason, "INVALID_INPUT");
    assert.equal((await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: database({ confirmedPrice: null }).database }) as any).reason, "CONFIRMATION_NOT_READY");
    assert.equal((await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: database({ status: CleaningRequestStatus.NEW }).database }) as any).reason, "INVALID_REQUEST_STATUS");
    assert.equal((await confirmCleaningRequestForAdmin("admin-1", { cleaningRequestId: "request-1" }, { database: database({ updateCount: 0 }).database }) as any).reason, "STATUS_CONFLICT");
  });
});
