import { Prisma } from "../generated/prisma/client";
import { findCustomerIdentityCandidates, normalizeCustomerIdentity } from "./customer-matching.service";
import type { ValidatedCleaningRequestCommand } from "./cleaning-request-validation.service";

type RegistrationTransaction = {
  customer: {
    findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string; isActive: boolean }>>;
    create: (args: { data: Record<string, unknown>; select: { id: true } }) => Promise<{ id: string }>;
  };
  $queryRaw?: (query: Prisma.Sql) => Promise<unknown>;
};

function identityLockKeys(identity: { email: string | null; phone: string | null }): string[] {
  return [
    identity.email ? `email:${identity.email}` : null,
    identity.phone ? `phone:${identity.phone}` : null,
  ].filter((value): value is string => value !== null).sort();
}

async function lockIdentity(transaction: RegistrationTransaction, identity: { email: string | null; phone: string | null }): Promise<void> {
  if (!transaction.$queryRaw) return;
  for (const key of identityLockKeys(identity)) {
    await transaction.$queryRaw(Prisma.sql`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`cleaning-service:customer-registration:${key}`}))) AS advisory_lock`);
  }
}

/**
 * Creates a reusable Customer only when neither normalized identity field
 * collides with an existing active or inactive Customer. The caller owns the
 * surrounding transaction so a later request/notification failure rolls back
 * the Customer as well.
 */
export async function createCustomerForNewRequestIfSafe(transaction: RegistrationTransaction, command: ValidatedCleaningRequestCommand): Promise<string | null> {
  const identity = normalizeCustomerIdentity({ email: command.customerEmail, phone: command.customerPhone });
  if (!identity) return null;

  await lockIdentity(transaction, identity);
  const resolved = await findCustomerIdentityCandidates({ email: identity.email, phone: identity.phone }, { database: transaction, includeInactive: true });
  if (!resolved || resolved.candidates.length > 0) return null;

  const created = await transaction.customer.create({
    data: { name: command.customerName, email: identity.email, phone: identity.phone, isActive: true },
    select: { id: true },
  });
  return created.id;
}
