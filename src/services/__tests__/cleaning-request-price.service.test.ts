import assert from "node:assert/strict";
import test from "node:test";
import { CleaningRequestStatus, Prisma } from "../../generated/prisma/client.js";
import { getCleaningRequestPriceHistory, setCleaningRequestConfirmedPriceForAdmin } from "../cleaning-request-price.service.js";

type State = { id: string; requestNumber: string; status: CleaningRequestStatus; confirmedPrice: Prisma.Decimal | null; estimatedPrice: Prisma.Decimal; estimateOutcome: string; scheduledStart: Date | null; scheduledEnd: Date | null };

function database(initial: Partial<State> = {}, historyFailure = false) {
  let state: State = { id: "request-1", requestNumber: "JC-2026-0042", status: CleaningRequestStatus.REVIEWING, confirmedPrice: null, estimatedPrice: new Prisma.Decimal("200.00"), estimateOutcome: "AUTOMATIC_ESTIMATE", scheduledStart: null, scheduledEnd: null, ...initial };
  const history: Array<{ id: string; previousConfirmedPrice: Prisma.Decimal | null; newConfirmedPrice: Prisma.Decimal; reason: string | null; createdAt: Date; changedByAdminUserId: string }> = [];
  const db = {
    state: () => state,
    history,
    async $transaction<T>(callback: (transaction: never) => Promise<T>) {
      const before = { ...state };
      const historyLength = history.length;
      try {
        return await callback({
          cleaningRequest: {
            async findUnique() { return { id: state.id, requestNumber: state.requestNumber, status: state.status, confirmedPrice: state.confirmedPrice }; },
            async updateMany(args: { where: { confirmedPrice: Prisma.Decimal | null }; data: { confirmedPrice: Prisma.Decimal } }) {
              const current = state.confirmedPrice;
              const matches = args.where.confirmedPrice === null ? current === null : current?.eq(args.where.confirmedPrice) === true;
              if (!matches) return { count: 0 };
              state = { ...state, confirmedPrice: args.data.confirmedPrice };
              return { count: 1 };
            },
          },
          cleaningRequestPriceHistory: {
            async create(args: { data: { previousConfirmedPrice: Prisma.Decimal | null; newConfirmedPrice: Prisma.Decimal; reason: string | null; createdAt: Date; changedByAdminUserId: string } }) {
              if (historyFailure) throw new Error("history failed");
              const row = { id: `price-${history.length + 1}`, ...args.data };
              history.push(row);
              return row;
            },
          },
        } as never);
      } catch (error) {
        state = before;
        history.splice(historyLength);
        throw error;
      }
    },
    cleaningRequestPriceHistory: {
      async findMany() { return history.map((row) => ({ ...row, changedByAdminUser: { id: row.changedByAdminUserId, name: "Maria Rodriguez", email: "maria@example.com" } })); },
    },
  };
  return db;
}

test("sets the first confirmed price without requiring a reason", async () => {
  const db = database();
  const result = await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: "250.00" }, { database: db as never, now: new Date("2026-08-14T14:00:00.000Z") });
  assert.equal(result.success, true);
  assert.equal(db.state().confirmedPrice?.toFixed(2), "250.00");
  assert.equal(db.history[0]?.id, "price-1");
  assert.equal(db.history[0]?.previousConfirmedPrice, null);
  assert.equal(db.history[0]?.newConfirmedPrice.toFixed(2), "250.00");
  assert.equal(db.history[0]?.reason, null);
  assert.equal(db.history[0]?.changedByAdminUserId, "admin-1");
});

test("changes an existing price only with a reason and preserves exact money", async () => {
  const db = database({ confirmedPrice: new Prisma.Decimal("250.00") });
  const result = await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: 275.5, reason: "Scope changed" }, { database: db as never });
  assert.deepEqual(result, { success: true, request: { id: "request-1", requestNumber: "JC-2026-0042", status: CleaningRequestStatus.REVIEWING, confirmedPrice: "275.50" }, history: { id: "price-1", previousConfirmedPrice: "250.00", newConfirmedPrice: "275.50", reason: "Scope changed", createdAt: (result as { success: true; history: { createdAt: string } }).history.createdAt } });
  assert.equal(db.state().confirmedPrice?.toFixed(2), "275.50");
});

test("rejects invalid prices, no-ops, missing revision reasons, and disallowed statuses", async () => {
  for (const value of ["0", "-1", "NaN", "250.001", Infinity]) {
    const result = await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: value }, { database: database() as never });
    assert.deepEqual(result, { success: false, reason: "INVALID_INPUT" });
  }
  assert.deepEqual(await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: "250.00" }, { database: database({ confirmedPrice: new Prisma.Decimal("250.00") }) as never }), { success: false, reason: "NO_PRICE_CHANGE" });
  assert.deepEqual(await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: "275.00", reason: "   " }, { database: database({ confirmedPrice: new Prisma.Decimal("250.00") }) as never }), { success: false, reason: "PRICE_CHANGE_REASON_REQUIRED" });
  assert.deepEqual(await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: "250.00" }, { database: database({ status: CleaningRequestStatus.NEW }) as never }), { success: false, reason: "INVALID_REQUEST_STATUS" });
});

test("does not accept browser-supplied actor or previous price fields", async () => {
  const db = database();
  const result = await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: "250.00", changedByAdminUserId: "admin-2", previousConfirmedPrice: "999.00" }, { database: db as never });
  assert.equal(result.success, false);
  assert.equal(db.history.length, 0);
});

test("rolls back the current price when history creation fails", async () => {
  const db = database({ confirmedPrice: new Prisma.Decimal("250.00") }, true);
  const result = await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: "275.00", reason: "Correction" }, { database: db as never });
  assert.deepEqual(result, { success: false, reason: "INTERNAL_ERROR" });
  assert.equal(db.state().confirmedPrice?.toFixed(2), "250.00");
  assert.equal(db.history.length, 0);
});

test("returns a conflict for stale price updates without retrying", async () => {
  const db = database({ confirmedPrice: new Prisma.Decimal("250.00") });
  const result = await setCleaningRequestConfirmedPriceForAdmin("admin-1", { cleaningRequestId: "request-1", confirmedPrice: "275.00", reason: "Correction" }, { database: { ...db, $transaction: async (callback: (transaction: never) => Promise<unknown>) => callback({ cleaningRequest: { async findUnique() { return { id: "request-1", requestNumber: "JC-2026-0042", status: CleaningRequestStatus.REVIEWING, confirmedPrice: new Prisma.Decimal("250.00") }; }, async updateMany() { return { count: 0 }; } }, cleaningRequestPriceHistory: { async create() { throw new Error("should not run"); } } } as never) } as never });
  assert.deepEqual(result, { success: false, reason: "STATUS_CONFLICT" });
  assert.equal(db.state().confirmedPrice?.toFixed(2), "250.00");
});

test("reads price history oldest first and omits auth internals", async () => {
  const db = database();
  db.history.push({ id: "price-2", previousConfirmedPrice: new Prisma.Decimal("250.00"), newConfirmedPrice: new Prisma.Decimal("275.00"), reason: "Scope changed", createdAt: new Date("2026-08-15"), changedByAdminUserId: "admin-1" }, { id: "price-1", previousConfirmedPrice: null, newConfirmedPrice: new Prisma.Decimal("250.00"), reason: null, createdAt: new Date("2026-08-14"), changedByAdminUserId: "admin-1" });
  const result = await getCleaningRequestPriceHistory("request-1", { database: db as never });
  assert.deepEqual(result.map((item) => item.id), ["price-2", "price-1"]);
  assert.equal(result[0]?.newConfirmedPrice, "275.00");
  assert.equal("passwordHash" in (result[0]?.changedBy ?? {}), false);
});
