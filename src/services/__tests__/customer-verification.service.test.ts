/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import { CUSTOMER_VERIFICATION_MAX_ATTEMPTS, startReturningCustomerVerification, verifyReturningCustomerCode } from "../customer-verification.service.js";

const now = new Date("2026-08-15T16:00:00Z");
function database(options: { email?: string | null; active?: boolean; duplicate?: boolean } = {}) {
  const customer = { id: "customer-1", email: options.email ?? "jane@example.com", phone: "+19735551111", name: "Jane", isActive: options.active ?? true };
  const challenges = new Map<string, any>();
  let sequence = 0;
  const db: any = {
    customer: {
      async findMany(args: any) { const matches = args.where.OR.some((condition: any) => (condition.email && condition.email === customer.email) || (condition.phone && condition.phone === customer.phone)); return matches ? (options.duplicate ? [{ id: "customer-1" }, { id: "customer-2" }] : [{ id: customer.id }]) : []; },
      async findUnique({ where }: any) { return where.id === customer.id ? customer : null; },
    },
    customerVerificationChallenge: {
      async findFirst({ where }: any) { const matches = [...challenges.values()].filter((row) => row.customerId === where.customerId && row.createdAt >= where.createdAt.gte); return matches.length ? { id: matches[matches.length - 1].id } : null; },
      async count({ where }: any) { return [...challenges.values()].filter((row) => row.customerId === where.customerId && row.createdAt >= where.createdAt.gte).length; },
      async updateMany({ where, data }: any) {
        let count = 0;
        for (const row of challenges.values()) {
          if (where.id && row.id !== where.id) continue;
          if (where.customerId && row.customerId !== where.customerId) continue;
          if (where.verifiedAt === null && row.verifiedAt !== null) continue;
          if (where.consumedAt === null && row.consumedAt !== null) continue;
          if (where.attemptCount?.lt !== undefined && row.attemptCount >= where.attemptCount.lt) continue;
          if (where.expiresAt?.gt && row.expiresAt <= where.expiresAt.gt) continue;
          Object.entries(data).forEach(([key, value]: any) => { row[key] = key === "attemptCount" ? row[key] + value.increment : value; });
          count += 1;
        }
        return { count };
      },
      async findUnique({ where }: any) { return challenges.get(where.id) ?? null; },
      async create({ data }: any) { const row = { id: `challenge-${++sequence}`, attemptCount: 0, verifiedAt: null, consumedAt: null, ...data }; challenges.set(row.id, row); return row; },
    },
  };
  db.$transaction = async (callback: (transaction: any) => Promise<unknown>) => callback(db);
  return { db, challenges, customer };
}

const provider = { async sendEmail(input: any) { return { success: true as const, providerMessageId: input.idempotencyKey }; } };
const failingProvider = { async sendEmail() { return { success: false as const, errorCode: "PROVIDER_UNAVAILABLE" as const }; } };
function codeFrom(providerInput: any): string { return providerInput.html.match(/>(\d{6})<\/p>/)?.[1] ?? ""; }

test("creates a hashed email challenge for email and phone matches without exposing customer data", async () => {
  const f = database();
  let sent: any;
  const result = await startReturningCustomerVerification({ email: "JANE@EXAMPLE.COM" }, { database: f.db, now, emailProvider: { async sendEmail(input) { sent = input; return provider.sendEmail(input); } } });
  assert.equal(result.outcome, "STARTED");
  const challenge = [...f.challenges.values()][0];
  assert.equal(challenge.emailSnapshot, "jane@example.com");
  assert.notEqual(challenge.codeHash, codeFrom(sent));
  assert.equal(challenge.codeHash.includes(codeFrom(sent)), false);
  assert.match(sent.idempotencyKey, /^customer-verification\/challenge-/);
});

test("does not email no-match, ambiguous, inactive, or no-email customers", async () => {
  let calls = 0;
  const noMatch = database({ email: null });
  assert.equal((await startReturningCustomerVerification({ email: "nobody@example.com" }, { database: noMatch.db, now, emailProvider: { async sendEmail() { calls += 1; return provider.sendEmail({}); } } })).outcome, "NO_MATCH");
  const ambiguous = database({ duplicate: true });
  assert.equal((await startReturningCustomerVerification({ email: "jane@example.com" }, { database: ambiguous.db, now, emailProvider: { async sendEmail() { calls += 1; return provider.sendEmail({}); } } })).outcome, "AMBIGUOUS");
  const inactive = database({ active: false });
  assert.equal((await startReturningCustomerVerification({ email: "jane@example.com" }, { database: inactive.db, now, emailProvider: { async sendEmail() { calls += 1; return provider.sendEmail({}); } } })).outcome, "UNVERIFIABLE");
  assert.equal(calls, 0);
});

test("verifies correct code once, rejects wrong codes, and enforces attempts", async () => {
  const f = database();
  let sent: any;
  const started = await startReturningCustomerVerification({ email: "jane@example.com" }, { database: f.db, now, emailProvider: { async sendEmail(input) { sent = input; return provider.sendEmail(input); } } });
  assert.equal(started.outcome, "STARTED");
  const challengeId = (started as { challengeId: string }).challengeId;
  const wrong = await verifyReturningCustomerCode({ challengeId, code: "000000" }, { database: f.db, now });
  assert.equal(wrong.outcome, "INVALID_OR_EXPIRED_CODE");
  const code = codeFrom(sent);
  const verified = await verifyReturningCustomerCode({ challengeId, code }, { database: f.db, now });
  assert.deepEqual(verified, { outcome: "VERIFIED", customerId: "customer-1" });
  assert.equal((await verifyReturningCustomerCode({ challengeId, code }, { database: f.db, now })).outcome, "INVALID_OR_EXPIRED_CODE");

  const limited = database();
  let limitedSent: any;
  const limitedStart = await startReturningCustomerVerification({ email: "jane@example.com" }, { database: limited.db, now, emailProvider: { async sendEmail(input) { limitedSent = input; return provider.sendEmail(input); } } });
  const limitedId = (limitedStart as { challengeId: string }).challengeId;
  for (let attempt = 0; attempt < CUSTOMER_VERIFICATION_MAX_ATTEMPTS; attempt++) await verifyReturningCustomerCode({ challengeId: limitedId, code: "000000" }, { database: limited.db, now });
  assert.equal((await verifyReturningCustomerCode({ challengeId: limitedId, code: codeFrom(limitedSent) }, { database: limited.db, now })).outcome, "TOO_MANY_ATTEMPTS");
});

test("delivery failure consumes the challenge and a new challenge invalidates the old one", async () => {
  const failed = database();
  const failure = await startReturningCustomerVerification({ email: "jane@example.com" }, { database: failed.db, now, emailProvider: failingProvider });
  assert.equal(failure.outcome, "DELIVERY_FAILED");
  assert.equal([...failed.challenges.values()][0].consumedAt, now);

  const replaced = database();
  const first = await startReturningCustomerVerification({ email: "jane@example.com" }, { database: replaced.db, now, emailProvider: provider });
  const second = await startReturningCustomerVerification({ email: "jane@example.com" }, { database: replaced.db, now: new Date(now.getTime() + 61 * 1000), emailProvider: provider });
  assert.equal(first.outcome, "STARTED");
  assert.equal(second.outcome, "STARTED");
  assert.equal([...replaced.challenges.values()][0].consumedAt?.getTime(), now.getTime() + 61 * 1000);
});

test("enforces the per-customer cooldown", async () => {
  const f = database();
  assert.equal((await startReturningCustomerVerification({ email: "jane@example.com" }, { database: f.db, now, emailProvider: provider })).outcome, "STARTED");
  assert.equal((await startReturningCustomerVerification({ email: "jane@example.com" }, { database: f.db, now: new Date(now.getTime() + 30 * 1000), emailProvider: provider })).outcome, "RATE_LIMITED");
});
