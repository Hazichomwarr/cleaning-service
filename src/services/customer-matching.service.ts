import { CustomerMatchingInputSchema } from "../lib/validations/customer-matching.schema";
import { normalizePhone } from "./cleaning-request-validation.service";

type CustomerCandidate = { id: string };
type Database = { customer: { findMany: (args: Record<string, unknown>) => Promise<CustomerCandidate[]> } };

export type CustomerMatchResult =
  | { outcome: "MATCHED"; customer: { id: string } }
  | { outcome: "NO_MATCH" }
  | { outcome: "AMBIGUOUS" }
  | { outcome: "INVALID_INPUT" };

export async function matchExistingCustomer(input: unknown, options: { database?: Database } = {}): Promise<CustomerMatchResult> {
  const parsed = CustomerMatchingInputSchema.safeParse(input);
  if (!parsed.success) return { outcome: "INVALID_INPUT" };

  const email = parsed.data.email ?? null;
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { outcome: "INVALID_INPUT" };
  if (!email && !phone) return { outcome: "INVALID_INPUT" };

  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const candidates = await database.customer.findMany({
    where: { isActive: true, OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }] },
    select: { id: true },
    take: 3,
    orderBy: { id: "asc" },
  });
  const distinctIds = new Set(candidates.map((candidate) => candidate.id));
  if (distinctIds.size === 0) return { outcome: "NO_MATCH" };
  if (distinctIds.size > 1 || candidates.length > 1) return { outcome: "AMBIGUOUS" };
  return { outcome: "MATCHED", customer: { id: candidates[0].id } };
}
