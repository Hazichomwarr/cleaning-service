import { CustomerMatchingInputSchema } from "../lib/validations/customer-matching.schema";
import { normalizePhone } from "./cleaning-request-validation.service";

type CustomerCandidate = { id: string; isActive?: boolean };
type Database = { customer: { findMany: (args: Record<string, unknown>) => Promise<CustomerCandidate[]> } };

export type NormalizedCustomerIdentity = { email: string | null; phone: string | null };

export function normalizeCustomerIdentity(input: unknown): NormalizedCustomerIdentity | null {
  const parsed = CustomerMatchingInputSchema.safeParse(input);
  if (!parsed.success) return null;

  const email = parsed.data.email ?? null;
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return null;
  if (!email && !phone) return null;
  return { email, phone };
}

export async function findCustomerIdentityCandidates(input: unknown, options: { database?: Database; includeInactive?: boolean } = {}): Promise<{ identity: NormalizedCustomerIdentity; candidates: CustomerCandidate[] } | null> {
  const identity = normalizeCustomerIdentity(input);
  if (!identity) return null;

  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const candidates = await database.customer.findMany({
    where: {
      ...(options.includeInactive ? {} : { isActive: true }),
      OR: [{ email: identity.email ?? undefined }, { phone: identity.phone ?? undefined }],
    },
    select: options.includeInactive ? { id: true, isActive: true } : { id: true },
    take: 3,
    orderBy: { id: "asc" },
  });
  return { identity, candidates };
}

export type CustomerMatchResult =
  | { outcome: "MATCHED"; customer: { id: string } }
  | { outcome: "NO_MATCH" }
  | { outcome: "AMBIGUOUS" }
  | { outcome: "INVALID_INPUT" };

export async function matchExistingCustomer(input: unknown, options: { database?: Database } = {}): Promise<CustomerMatchResult> {
  const result = await findCustomerIdentityCandidates(input, options);
  if (!result) return { outcome: "INVALID_INPUT" };
  const { candidates } = result;
  const distinctIds = new Set(candidates.map((candidate) => candidate.id));
  if (distinctIds.size === 0) return { outcome: "NO_MATCH" };
  if (distinctIds.size > 1 || candidates.length > 1) return { outcome: "AMBIGUOUS" };
  return { outcome: "MATCHED", customer: { id: candidates[0].id } };
}
