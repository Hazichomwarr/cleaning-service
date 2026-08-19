import assert from "node:assert/strict";
import test from "node:test";
import { CleaningRequestStatus } from "../../generated/prisma/client.js";
import { parseBusinessDateTime } from "../../lib/business-time.js";
import { getCleaningRequestScheduleHistory, setCleaningRequestConfirmedScheduleForAdmin } from "../cleaning-request-schedule.service.js";

type State = { id: string; requestNumber: string; status: CleaningRequestStatus; scheduledStart: Date | null; scheduledEnd: Date | null; preferredDate: string; preferredTimeWindow: string; confirmedPrice: string | null };

function database(initial: Partial<State> = {}, historyFailure = false) {
  let state: State = { id: "request-1", requestNumber: "JC-2026-0042", status: CleaningRequestStatus.REVIEWING, scheduledStart: null, scheduledEnd: null, preferredDate: "2026-08-16", preferredTimeWindow: "MORNING", confirmedPrice: "250.00", ...initial };
  const history: Array<{ id: string; previousScheduledStart: Date | null; previousScheduledEnd: Date | null; newScheduledStart: Date; newScheduledEnd: Date | null; reason: string | null; createdAt: Date; changedByAdminUserId: string }> = [];
  const db = {
    state: () => state,
    history,
    async $transaction<T>(callback: (transaction: never) => Promise<T>) {
      const before = { ...state };
      const historyLength = history.length;
      try {
        return await callback({
          cleaningRequest: {
            async findUnique() { return { id: state.id, requestNumber: state.requestNumber, status: state.status, scheduledStart: state.scheduledStart, scheduledEnd: state.scheduledEnd }; },
            async updateMany(args: { where: { scheduledStart: Date | null; scheduledEnd: Date | null }; data: { scheduledStart: Date; scheduledEnd: Date | null } }) {
              const startMatches = args.where.scheduledStart === null ? state.scheduledStart === null : state.scheduledStart?.getTime() === args.where.scheduledStart.getTime();
              const endMatches = args.where.scheduledEnd === null ? state.scheduledEnd === null : state.scheduledEnd?.getTime() === args.where.scheduledEnd.getTime();
              if (!startMatches || !endMatches) return { count: 0 };
              state = { ...state, scheduledStart: args.data.scheduledStart, scheduledEnd: args.data.scheduledEnd };
              return { count: 1 };
            },
          },
          cleaningRequestScheduleHistory: {
            async create(args: { data: { previousScheduledStart: Date | null; previousScheduledEnd: Date | null; newScheduledStart: Date; newScheduledEnd: Date | null; reason: string | null; createdAt: Date; changedByAdminUserId: string } }) {
              if (historyFailure) throw new Error("history failed");
              const row = { id: `schedule-${history.length + 1}`, ...args.data };
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
    cleaningRequestScheduleHistory: {
      async findMany() { return history.map((row) => ({ ...row, changedByAdminUser: { id: row.changedByAdminUserId, name: "Maria Rodriguez", email: "maria@example.com" } })); },
    },
  };
  return db;
}

test("resolves New York summer and winter times using DST-aware instants", () => {
  assert.deepEqual(parseBusinessDateTime("2026-08-16", "10:00"), { date: new Date("2026-08-16T14:00:00.000Z") });
  assert.deepEqual(parseBusinessDateTime("2026-12-16", "10:00"), { date: new Date("2026-12-16T15:00:00.000Z") });
});

test("rejects DST gap and ambiguous local times deliberately", () => {
  assert.deepEqual(parseBusinessDateTime("2026-03-08", "02:30"), { error: "INVALID_LOCAL_TIME" });
  assert.deepEqual(parseBusinessDateTime("2026-11-01", "01:30"), { error: "INVALID_LOCAL_TIME" });
});

test("sets a first schedule and preserves current price, status, and preference", async () => {
  const db = database();
  const result = await setCleaningRequestConfirmedScheduleForAdmin("admin-1", { cleaningRequestId: "request-1", date: "2026-08-16", appointmentTime: "10:00" }, { database: db as never, now: new Date("2026-08-13T15:00:00.000Z") });
  assert.equal(result.success, true);
  assert.equal(db.state().scheduledStart?.toISOString(), "2026-08-16T14:00:00.000Z");
  assert.equal(db.state().scheduledEnd, null);
  assert.equal(db.state().status, CleaningRequestStatus.REVIEWING);
  assert.equal(db.state().confirmedPrice, "250.00");
  assert.equal(db.state().preferredDate, "2026-08-16");
  assert.equal(db.state().preferredTimeWindow, "MORNING");
  assert.equal(db.history[0]?.previousScheduledStart, null);
});

test("reschedules only with a reason and rejects no-op/range/past values", async () => {
  const currentStart = new Date("2026-08-16T14:00:00.000Z");
  const currentEnd = new Date("2026-08-16T16:00:00.000Z");
  const db = database({ scheduledStart: currentStart, scheduledEnd: currentEnd });
  assert.deepEqual(await setCleaningRequestConfirmedScheduleForAdmin("admin-1", { cleaningRequestId: "request-1", date: "2026-08-16", appointmentTime: "10:00", reason: "   " }, { database: db as never, now: new Date("2026-08-13T15:00:00.000Z") }), { success: false, reason: "NO_SCHEDULE_CHANGE" });
  assert.deepEqual(await setCleaningRequestConfirmedScheduleForAdmin("admin-1", { cleaningRequestId: "request-1", date: "2026-08-17", appointmentTime: "13:00", reason: "   " }, { database: db as never, now: new Date("2026-08-13T15:00:00.000Z") }), { success: false, reason: "SCHEDULE_CHANGE_REASON_REQUIRED" });
  assert.deepEqual(await setCleaningRequestConfirmedScheduleForAdmin("admin-1", { cleaningRequestId: "request-1", date: "2026-08-12", appointmentTime: "10:00" }, { database: database() as never, now: new Date("2026-08-13T15:00:00.000Z") }), { success: false, reason: "SCHEDULE_IN_PAST" });
});

test("rejects disallowed states and incomplete current schedules", async () => {
  for (const status of [CleaningRequestStatus.NEW, CleaningRequestStatus.CONFIRMED, CleaningRequestStatus.CANCELLED]) {
    assert.deepEqual(await setCleaningRequestConfirmedScheduleForAdmin("admin-1", { cleaningRequestId: "request-1", date: "2026-08-16", appointmentTime: "10:00" }, { database: database({ status }) as never, now: new Date("2026-08-13T15:00:00.000Z") }), { success: false, reason: "INVALID_REQUEST_STATUS" });
  }
  assert.equal((await setCleaningRequestConfirmedScheduleForAdmin("admin-1", { cleaningRequestId: "request-1", date: "2026-08-17", appointmentTime: "10:00", reason: "Complete legacy appointment" }, { database: database({ scheduledStart: new Date("2026-08-16T14:00:00.000Z"), scheduledEnd: null }) as never, now: new Date("2026-08-13T15:00:00.000Z") })).success, true);
});

test("rolls back on history failure and conflicts stale schedule edits", async () => {
  const db = database({ scheduledStart: new Date("2026-08-16T14:00:00.000Z"), scheduledEnd: new Date("2026-08-16T16:00:00.000Z") }, true);
  const result = await setCleaningRequestConfirmedScheduleForAdmin("admin-1", { cleaningRequestId: "request-1", date: "2026-08-17", appointmentTime: "13:00", reason: "Change" }, { database: db as never, now: new Date("2026-08-13T15:00:00.000Z") });
  assert.deepEqual(result, { success: false, reason: "INTERNAL_ERROR" });
  assert.equal(db.state().scheduledStart?.toISOString(), "2026-08-16T14:00:00.000Z");
  const conflict = await setCleaningRequestConfirmedScheduleForAdmin("admin-1", { cleaningRequestId: "request-1", date: "2026-08-17", appointmentTime: "13:00", reason: "Change" }, { database: { ...db, $transaction: async (callback: (transaction: never) => Promise<unknown>) => callback({ cleaningRequest: { async findUnique() { return { id: "request-1", requestNumber: "JC-2026-0042", status: CleaningRequestStatus.REVIEWING, scheduledStart: new Date("2026-08-16T14:00:00.000Z"), scheduledEnd: new Date("2026-08-16T16:00:00.000Z") }; }, async updateMany() { return { count: 0 }; } }, cleaningRequestScheduleHistory: { async create() { throw new Error("should not run"); } } } as never) } as never, now: new Date("2026-08-13T15:00:00.000Z") });
  assert.deepEqual(conflict, { success: false, reason: "SCHEDULE_CONFLICT" });
});

test("reads schedule history oldest first with safe actors", async () => {
  const db = database();
  db.history.push({ id: "schedule-2", previousScheduledStart: new Date("2026-08-16T14:00:00.000Z"), previousScheduledEnd: new Date("2026-08-16T16:00:00.000Z"), newScheduledStart: new Date("2026-08-17T17:00:00.000Z"), newScheduledEnd: new Date("2026-08-17T19:00:00.000Z"), reason: "Change", createdAt: new Date("2026-08-15"), changedByAdminUserId: "admin-1" }, { id: "schedule-1", previousScheduledStart: null, previousScheduledEnd: null, newScheduledStart: new Date("2026-08-16T14:00:00.000Z"), newScheduledEnd: new Date("2026-08-16T16:00:00.000Z"), reason: null, createdAt: new Date("2026-08-14"), changedByAdminUserId: "admin-1" });
  const result = await getCleaningRequestScheduleHistory("request-1", { database: db as never });
  assert.deepEqual(result.map((item) => item.id), ["schedule-2", "schedule-1"]);
  assert.equal(result[0]?.newScheduledStart, "2026-08-17T17:00:00.000Z");
  assert.equal("passwordHash" in (result[0]?.changedBy ?? {}), false);
});
