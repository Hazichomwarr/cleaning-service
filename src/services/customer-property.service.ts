import { CustomerPropertyInputSchema } from "../lib/validations/customer.schema";
import { isValidUSState } from "./cleaning-request-validation.service";

type CustomerRow = { id: string; isActive: boolean };
type Database = { customer: { findUnique: (args: Record<string, unknown>) => Promise<CustomerRow | null> }; customerProperty: { create: (args: Record<string, unknown>) => Promise<{ id: string; customerId: string; isActive: boolean }> } };
export type CustomerPropertyCreationResult = { status: "SUCCESS"; property: { id: string; customerId: string; isActive: boolean } } | { status: "INVALID_INPUT"; fieldErrors: Record<string, string[]> } | { status: "CUSTOMER_NOT_FOUND" } | { status: "CUSTOMER_INACTIVE" } | { status: "INTERNAL_ERROR" };

function fieldErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) { return error.issues.reduce<Record<string, string[]>>((out, issue) => { const key = String(issue.path[0] ?? "form"); out[key] = [...(out[key] ?? []), issue.message]; return out; }, {}); }
export async function createCustomerProperty(customerId: string, input: unknown, options: { database?: Database } = {}): Promise<CustomerPropertyCreationResult> {
  const parsed = CustomerPropertyInputSchema.safeParse(input);
  if (!parsed.success) return { status: "INVALID_INPUT", fieldErrors: fieldErrors(parsed.error) };
  if (!isValidUSState(parsed.data.state)) return { status: "INVALID_INPUT", fieldErrors: { state: ["Enter a valid US state code."] } };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  try {
    const customer = await database.customer.findUnique({ where: { id: customerId }, select: { id: true, isActive: true } });
    if (!customer) return { status: "CUSTOMER_NOT_FOUND" };
    if (!customer.isActive) return { status: "CUSTOMER_INACTIVE" };
    const property = await database.customerProperty.create({ data: { customerId, label: parsed.data.label || null, propertyType: parsed.data.propertyType, addressLine1: parsed.data.addressLine1, addressLine2: parsed.data.addressLine2 || null, city: parsed.data.city, state: parsed.data.state, postalCode: parsed.data.postalCode, bedrooms: parsed.data.propertyType === "HOUSE" || parsed.data.propertyType === "APARTMENT" || parsed.data.propertyType === "AIRBNB" ? parsed.data.bedrooms ?? null : null, bathrooms: parsed.data.bathrooms ?? null, approximateSquareFeet: parsed.data.approximateSquareFeet ?? null, isActive: true }, select: { id: true, customerId: true, isActive: true } });
    return { status: "SUCCESS", property };
  } catch { return { status: "INTERNAL_ERROR" }; }
}
