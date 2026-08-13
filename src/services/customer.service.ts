import { Prisma } from "../generated/prisma/client";
import { CustomerInputSchema } from "../lib/validations/customer.schema";
import { isValidUSState, normalizePhone } from "./cleaning-request-validation.service";

type Database = { customer: { findFirst: (args: Record<string, unknown>) => Promise<{ id: string; name: string; email: string | null; phone: string | null } | null>; create: (args: Record<string, unknown>) => Promise<{ id: string; name: string; email: string | null; phone: string | null; properties?: Array<{ id: string }> }> } };
export type CustomerCreationResult =
  | { status: "SUCCESS"; customer: { id: string; name: string; email: string | null; phone: string | null; propertyId: string | null } }
  | { status: "INVALID_INPUT"; fieldErrors: Record<string, string[]> }
  | { status: "POSSIBLE_DUPLICATE"; matches: Array<{ id: string; name: string; email: string | null; phone: string | null }> }
  | { status: "INTERNAL_ERROR" };

function errors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) { return error.issues.reduce<Record<string, string[]>>((out, issue) => { const key = String(issue.path[0] ?? "form"); out[key] = [...(out[key] ?? []), issue.message]; return out; }, {}); }

export async function createCustomer(input: unknown, options: { database?: Database } = {}): Promise<CustomerCreationResult> {
  const parsed = CustomerInputSchema.safeParse(input);
  if (!parsed.success) return { status: "INVALID_INPUT", fieldErrors: errors(parsed.error) };
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { status: "INVALID_INPUT", fieldErrors: { phone: ["Enter a valid US phone number."] } };
  if (parsed.data.property && !isValidUSState(parsed.data.property.state)) return { status: "INVALID_INPUT", fieldErrors: { "property.state": ["Enter a valid US state code."] } };
  const data = { ...parsed.data, phone, email: parsed.data.email || null };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  try {
    const matches = await database.customer.findFirst({ where: { OR: [{ email: data.email ?? undefined }, { phone: data.phone ?? undefined }], NOT: [{ email: null, phone: null }] }, select: { id: true, name: true, email: true, phone: true } });
    if (matches && !data.allowDuplicateContact) return { status: "POSSIBLE_DUPLICATE", matches: [matches] };
    const property = data.property ? { create: { ...data.property, addressLine2: data.property.addressLine2 || null, label: data.property.label || null, bedrooms: data.property.propertyType === "HOUSE" || data.property.propertyType === "APARTMENT" || data.property.propertyType === "AIRBNB" ? data.property.bedrooms ?? null : null, bathrooms: data.property.bathrooms ?? null, approximateSquareFeet: data.property.approximateSquareFeet ?? null } } : undefined;
    const created = await database.customer.create({ data: { name: data.name, email: data.email, phone: data.phone, properties: property }, select: { id: true, name: true, email: true, phone: true, properties: { select: { id: true } } } });
    return { status: "SUCCESS", customer: { id: created.id, name: created.name, email: created.email, phone: created.phone, propertyId: created.properties?.[0]?.id ?? null } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { status: "INTERNAL_ERROR" };
    return { status: "INTERNAL_ERROR" };
  }
}
