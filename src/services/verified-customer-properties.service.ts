import type { PropertyType } from "../generated/prisma/client";

type PropertyRow = {
  id: string; label: string | null; addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string;
  propertyType: PropertyType; bedrooms: number | null; bathrooms: { toString: () => string } | null; approximateSquareFeet: number | null;
};
type Database = { customer: { findUnique: (args: Record<string, unknown>) => Promise<{ id: string; properties: PropertyRow[] } | null> } };

export type VerifiedCustomerPropertyOption = {
  id: string;
  label: string | null;
  address: { line1: string; line2: string | null; city: string; state: string; postalCode: string };
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: string | null;
  approximateSquareFeet: number | null;
};

export async function getVerifiedCustomerSavedProperties(customerId: string, options: { database?: Database } = {}): Promise<VerifiedCustomerPropertyOption[] | null> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const customer = await database.customer.findUnique({
    where: { id: customerId, isActive: true },
    select: {
      id: true,
      properties: {
        where: { isActive: true },
        orderBy: [{ addressLine1: "asc" }, { id: "asc" }],
        take: 50,
        select: { id: true, label: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, propertyType: true, bedrooms: true, bathrooms: true, approximateSquareFeet: true },
      },
    },
  });
  if (!customer) return null;
  return [...customer.properties]
    .sort((left, right) => (left.label === null ? 1 : right.label === null ? -1 : left.label.localeCompare(right.label)) || left.addressLine1.localeCompare(right.addressLine1) || left.id.localeCompare(right.id))
    .map((property) => ({
      id: property.id,
      label: property.label,
      address: { line1: property.addressLine1, line2: property.addressLine2, city: property.city, state: property.state, postalCode: property.postalCode },
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms?.toString() ?? null,
      approximateSquareFeet: property.approximateSquareFeet,
    }));
}
