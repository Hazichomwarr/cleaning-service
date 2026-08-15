import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { StartReturningCustomerVerificationSchema, VerifyReturningCustomerCodeSchema } from "../lib/validations/customer-verification.schema";
import { matchExistingCustomer } from "./customer-matching.service";
import { renderReturningCustomerVerificationEmail, returningCustomerVerificationSubject } from "../emails/returning-customer-verification.email";
import { createResendEmailProvider, type EmailProvider } from "../lib/email/resend-email.provider";

export const CUSTOMER_VERIFICATION_CODE_LIFETIME_MS = 10 * 60 * 1000;
export const CUSTOMER_VERIFICATION_MAX_ATTEMPTS = 5;
export const CUSTOMER_VERIFICATION_COOLDOWN_MS = 60 * 1000;
export const CUSTOMER_VERIFICATION_HOURLY_LIMIT = 5;

type ChallengeRow = { id: string; customerId: string; emailSnapshot: string; codeHash: string; expiresAt: Date; attemptCount: number; maxAttempts: number; verifiedAt: Date | null; consumedAt: Date | null };
type CustomerRow = { id: string; email: string | null; name: string; isActive: boolean };
type Database = {
  customer: { findUnique: (args: Record<string, unknown>) => Promise<CustomerRow | null>; findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string }>> };
  customerVerificationChallenge: {
    findFirst: (args: Record<string, unknown>) => Promise<{ id: string } | null>;
    count: (args: Record<string, unknown>) => Promise<number>;
    updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
    findUnique: (args: Record<string, unknown>) => Promise<ChallengeRow | null>;
    create: (args: Record<string, unknown>) => Promise<ChallengeRow>;
  };
  $transaction: <T>(callback: (transaction: Database) => Promise<T>) => Promise<T>;
};

export type StartReturningCustomerVerificationResult =
  | { outcome: "STARTED"; challengeId: string }
  | { outcome: "INVALID_INPUT" | "NO_MATCH" | "AMBIGUOUS" | "UNVERIFIABLE" | "RATE_LIMITED" | "DELIVERY_FAILED" };

export type VerifyReturningCustomerCodeResult =
  | { outcome: "VERIFIED"; customerId: string }
  | { outcome: "INVALID_INPUT" | "INVALID_OR_EXPIRED_CODE" | "TOO_MANY_ATTEMPTS" };

function usableEmail(email: string | null): email is string {
  return Boolean(email && /^\S+@\S+\.\S+$/.test(email.trim()));
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function startReturningCustomerVerification(input: unknown, options: { database?: Database; emailProvider?: EmailProvider; now?: Date } = {}): Promise<StartReturningCustomerVerificationResult> {
  const parsed = StartReturningCustomerVerificationSchema.safeParse(input);
  if (!parsed.success) return { outcome: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const matched = await matchExistingCustomer(parsed.data, { database });
  if (matched.outcome !== "MATCHED") return { outcome: matched.outcome };
  const now = options.now ?? new Date();
  const customer = await database.customer.findUnique({ where: { id: matched.customer.id }, select: { id: true, email: true, name: true, isActive: true } });
  if (!customer?.isActive || !usableEmail(customer.email)) return { outcome: "UNVERIFIABLE" };
  const email = customer.email.trim().toLowerCase();
  const cooldown = await database.customerVerificationChallenge.findFirst({ where: { customerId: customer.id, createdAt: { gte: new Date(now.getTime() - CUSTOMER_VERIFICATION_COOLDOWN_MS) } }, orderBy: { createdAt: "desc" }, select: { id: true } });
  const hourlyCount = await database.customerVerificationChallenge.count({ where: { customerId: customer.id, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } } });
  if (cooldown || hourlyCount >= CUSTOMER_VERIFICATION_HOURLY_LIMIT) return { outcome: "RATE_LIMITED" };

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 12);
  const challenge = await database.$transaction(async (transaction) => {
    await transaction.customerVerificationChallenge.updateMany({ where: { customerId: customer.id, verifiedAt: null, consumedAt: null }, data: { consumedAt: now } });
    return transaction.customerVerificationChallenge.create({ data: { customerId: customer.id, emailSnapshot: email, codeHash, expiresAt: new Date(now.getTime() + CUSTOMER_VERIFICATION_CODE_LIFETIME_MS), maxAttempts: CUSTOMER_VERIFICATION_MAX_ATTEMPTS, createdAt: now }, select: { id: true, customerId: true, emailSnapshot: true, codeHash: true, expiresAt: true, attemptCount: true, maxAttempts: true, verifiedAt: true, consumedAt: true } });
  });
  const provider = options.emailProvider ?? createResendEmailProvider();
  let delivery: Awaited<ReturnType<EmailProvider["sendEmail"]>>;
  try {
    delivery = await provider.sendEmail({ to: challenge.emailSnapshot, subject: returningCustomerVerificationSubject, html: renderReturningCustomerVerificationEmail(customer.name, code), idempotencyKey: `customer-verification/${challenge.id}` });
  } catch {
    delivery = { success: false, errorCode: "UNKNOWN_DELIVERY_ERROR" };
  }
  if (!delivery.success) {
    await database.customerVerificationChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: now } });
    return { outcome: "DELIVERY_FAILED" };
  }
  return { outcome: "STARTED", challengeId: challenge.id };
}

export async function verifyReturningCustomerCode(input: unknown, options: { database?: Database; now?: Date } = {}): Promise<VerifyReturningCustomerCodeResult> {
  const parsed = VerifyReturningCustomerCodeSchema.safeParse(input);
  if (!parsed.success) return { outcome: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const challenge = await database.customerVerificationChallenge.findUnique({ where: { id: parsed.data.challengeId }, select: { id: true, customerId: true, emailSnapshot: true, codeHash: true, expiresAt: true, attemptCount: true, maxAttempts: true, verifiedAt: true, consumedAt: true } });
  const now = options.now ?? new Date();
  if (!challenge || challenge.expiresAt <= now || challenge.verifiedAt || challenge.consumedAt || challenge.attemptCount >= challenge.maxAttempts) return { outcome: challenge && challenge.attemptCount >= challenge.maxAttempts ? "TOO_MANY_ATTEMPTS" : "INVALID_OR_EXPIRED_CODE" };
  const correct = await bcrypt.compare(parsed.data.code, challenge.codeHash);
  if (!correct) {
    const updated = await database.customerVerificationChallenge.updateMany({ where: { id: challenge.id, verifiedAt: null, consumedAt: null, expiresAt: { gt: now }, attemptCount: { lt: challenge.maxAttempts } }, data: { attemptCount: { increment: 1 } } });
    if (updated.count !== 1 || challenge.attemptCount + 1 >= challenge.maxAttempts) return { outcome: "TOO_MANY_ATTEMPTS" };
    return { outcome: "INVALID_OR_EXPIRED_CODE" };
  }
  const customer = await database.customer.findUnique({ where: { id: challenge.customerId }, select: { id: true, isActive: true } });
  if (!customer?.isActive) return { outcome: "INVALID_OR_EXPIRED_CODE" };
  const claimed = await database.customerVerificationChallenge.updateMany({ where: { id: challenge.id, verifiedAt: null, consumedAt: null, expiresAt: { gt: now }, attemptCount: { lt: challenge.maxAttempts } }, data: { verifiedAt: now, consumedAt: now } });
  return claimed.count === 1 ? { outcome: "VERIFIED", customerId: challenge.customerId } : { outcome: "INVALID_OR_EXPIRED_CODE" };
}
