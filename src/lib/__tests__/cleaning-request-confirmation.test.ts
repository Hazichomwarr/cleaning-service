import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma, CleaningRequestStatus } from "../../generated/prisma/client";
import { getCleaningRequestConfirmationReadiness } from "../cleaning-request-confirmation";

const date = (hours: number) => new Date(`2030-01-01T${String(hours).padStart(2, "0")}:00:00.000Z`);
const facts = (overrides: Partial<Parameters<typeof getCleaningRequestConfirmationReadiness>[0]> = {}) => ({ status: CleaningRequestStatus.REVIEWING, confirmedPrice: new Prisma.Decimal("250"), scheduledStart: date(10), scheduledEnd: date(12), ...overrides });

describe("cleaning request confirmation readiness", () => {
  it("is ready only with a positive confirmed price and complete forward schedule", () => assert.deepEqual(getCleaningRequestConfirmationReadiness(facts()), { ready: true, missing: [], invalid: [] }));
  it("reports missing price and schedule fields", () => assert.deepEqual(getCleaningRequestConfirmationReadiness(facts({ confirmedPrice: null, scheduledStart: null, scheduledEnd: null })), { ready: false, missing: ["CONFIRMED_PRICE", "SCHEDULE_START", "SCHEDULE_END"], invalid: [] }));
  it("reports invalid price and range", () => assert.deepEqual(getCleaningRequestConfirmationReadiness(facts({ confirmedPrice: new Prisma.Decimal("0"), scheduledEnd: date(9) })), { ready: false, missing: [], invalid: ["CONFIRMED_PRICE", "SCHEDULE_RANGE"] }));
  it("does not allow non-reviewing requests even when facts exist", () => assert.equal(getCleaningRequestConfirmationReadiness(facts({ status: CleaningRequestStatus.NEW })).ready, false));
});
