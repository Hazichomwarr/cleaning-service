import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CUSTOMER_VERIFICATION_ATTEMPT_COOKIE = "returning_customer_verification_attempt";
export const CUSTOMER_VERIFICATION_COOKIE = "returning_customer_verification";
export const CUSTOMER_VERIFICATION_STATE_PURPOSE = "RETURNING_CUSTOMER_REQUEST";
export const CUSTOMER_VERIFICATION_ATTEMPT_PURPOSE = "RETURNING_CUSTOMER_VERIFICATION";
export const CUSTOMER_VERIFICATION_STATE_MAX_AGE_SECONDS = 30 * 60;

type AttemptPayload = { purpose: typeof CUSTOMER_VERIFICATION_ATTEMPT_PURPOSE; challengeId: string | null; exp: number; nonce: string };
type VerifiedPayload = { purpose: typeof CUSTOMER_VERIFICATION_STATE_PURPOSE; customerId: string; exp: number; nonce: string };

function secret(value?: string): string {
  const configured = value ?? process.env.CUSTOMER_VERIFICATION_SECRET;
  if (!configured) throw new Error("CUSTOMER_VERIFICATION_SECRET is not configured");
  return configured;
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: string, configuredSecret?: string): string {
  return createHmac("sha256", secret(configuredSecret)).update(payload).digest("base64url");
}

function issue(payload: object, configuredSecret?: string): string {
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded, configuredSecret)}`;
}

function read<T extends { purpose: string; exp: number }>(token: string, purpose: T["purpose"], configuredSecret?: string): T | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = Buffer.from(sign(encoded, configuredSecret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
    return payload.purpose === purpose && Number.isInteger(payload.exp) && payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
}

export function issueCustomerVerificationAttemptToken(challengeId: string | null, now = new Date(), configuredSecret?: string): string {
  return issue({ purpose: CUSTOMER_VERIFICATION_ATTEMPT_PURPOSE, challengeId, exp: Math.floor(now.getTime() / 1000) + CUSTOMER_VERIFICATION_STATE_MAX_AGE_SECONDS, nonce: cryptoRandomId() }, configuredSecret);
}

export function readCustomerVerificationAttemptToken(token: string, configuredSecret?: string): AttemptPayload | null {
  return read<AttemptPayload>(token, CUSTOMER_VERIFICATION_ATTEMPT_PURPOSE, configuredSecret);
}

export function issueCustomerVerificationState(customerId: string, now = new Date(), configuredSecret?: string): string {
  return issue({ purpose: CUSTOMER_VERIFICATION_STATE_PURPOSE, customerId, exp: Math.floor(now.getTime() / 1000) + CUSTOMER_VERIFICATION_STATE_MAX_AGE_SECONDS, nonce: cryptoRandomId() }, configuredSecret);
}

export function readCustomerVerificationState(token: string, configuredSecret?: string): VerifiedPayload | null {
  return read<VerifiedPayload>(token, CUSTOMER_VERIFICATION_STATE_PURPOSE, configuredSecret);
}

function cryptoRandomId(): string {
  return randomBytes(16).toString("base64url");
}
