import { CleaningEstimateOutcome, CleaningRequestStatus, type PropertyType } from "../generated/prisma/client";

export type AdminCustomerDetail = {
  id: string; name: string; email: string | null; phone: string | null; isActive: boolean;
  properties: Array<{ id: string; label: string | null; addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string; propertyType: PropertyType; bedrooms: number | null; bathrooms: string | null; approximateSquareFeet: number | null; isActive: boolean; createdAt: string; updatedAt: string }>;
  requests: Array<{ id: string; requestNumber: string; serviceName: string; status: CleaningRequestStatus; propertyType: PropertyType; preferredDate: string; preferredTimeWindow: string; scheduledStart: string | null; estimateOutcome: CleaningEstimateOutcome; estimatedPrice: string | null; confirmedPrice: string | null; createdAt: string }>;
  createdAt: string; updatedAt: string;
};

type Row = Omit<AdminCustomerDetail, "properties" | "requests" | "createdAt" | "updatedAt"> & { createdAt: Date; updatedAt: Date; properties: Array<Omit<AdminCustomerDetail["properties"][number], "bathrooms" | "createdAt" | "updatedAt"> & { bathrooms: { toString(): string } | null; createdAt: Date; updatedAt: Date }>; requests: Array<Omit<AdminCustomerDetail["requests"][number], "preferredDate" | "scheduledStart" | "estimatedPrice" | "confirmedPrice" | "createdAt"> & { preferredDate: Date; scheduledStart: Date | null; estimatedPrice: { toFixed(digits: number): string } | null; confirmedPrice: { toFixed(digits: number): string } | null; createdAt: Date; service: { name: string } }> };
type Database = { customer: { findUnique: (args: Record<string, unknown>) => Promise<Row | null> } };

export const customerDetailSelect = {
  id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, updatedAt: true,
  properties: { orderBy: [{ isActive: "desc" }, { createdAt: "asc" }, { id: "asc" }], select: { id: true, label: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, propertyType: true, bedrooms: true, bathrooms: true, approximateSquareFeet: true, isActive: true, createdAt: true, updatedAt: true } },
  requests: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10, select: { id: true, requestNumber: true, status: true, propertyType: true, preferredDate: true, preferredTimeWindow: true, scheduledStart: true, estimateOutcome: true, estimatedPrice: true, confirmedPrice: true, createdAt: true, service: { select: { name: true } } } },
};

function money(value: { toFixed(digits: number): string } | null): string | null { return value?.toFixed(2) ?? null; }
export async function getAdminCustomerDetail(id: string, options: { database?: Database } = {}): Promise<AdminCustomerDetail | null> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const row = await database.customer.findUnique({ where: { id }, select: customerDetailSelect });
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, isActive: row.isActive, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), properties: row.properties.map((property) => ({ ...property, bathrooms: property.bathrooms?.toString() ?? null, createdAt: property.createdAt.toISOString(), updatedAt: property.updatedAt.toISOString() })), requests: row.requests.map((request) => ({ id: request.id, requestNumber: request.requestNumber, serviceName: request.service.name, status: request.status, propertyType: request.propertyType, preferredDate: request.preferredDate.toISOString().slice(0, 10), preferredTimeWindow: request.preferredTimeWindow, scheduledStart: request.scheduledStart?.toISOString() ?? null, estimateOutcome: request.estimateOutcome, estimatedPrice: money(request.estimatedPrice), confirmedPrice: money(request.confirmedPrice), createdAt: request.createdAt.toISOString() })) };
}
