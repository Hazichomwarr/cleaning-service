import { type PropertyType } from "../generated/prisma/client";
import { ADMIN_CUSTOMERS_PAGE_SIZE, type AdminCustomersQuery } from "../lib/admin-customers-query";
import { normalizePhone } from "./cleaning-request-validation.service";

export type AdminCustomerListItem = { id: string; name: string; email: string | null; phone: string | null; isActive: boolean; propertyCount: number; requestCount: number };
export type AdminCustomersResult = { items: AdminCustomerListItem[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } };

type Row = { id: string; name: string; email: string | null; phone: string | null; isActive: boolean; _count: { requests: number; properties: number } };
type Database = { customer: { count: (args: { where: Record<string, unknown> }) => Promise<number>; findMany: (args: Record<string, unknown>) => Promise<Row[]> } };

export function buildCustomerWhere(query: AdminCustomersQuery): Record<string, unknown> {
  if (!query.search) return {};
  const phone = normalizePhone(query.search);
  return { OR: [
    { name: { contains: query.search, mode: "insensitive" } },
    { email: { contains: query.search, mode: "insensitive" } },
    { phone: { contains: phone ?? query.search } },
  ] };
}

export async function getAdminCustomers(query: AdminCustomersQuery, options: { database?: Database; pageSize?: number } = {}): Promise<AdminCustomersResult> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? ADMIN_CUSTOMERS_PAGE_SIZE));
  const where = buildCustomerWhere(query);
  const totalItems = await database.customer.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(query.page, totalPages);
  const rows = await database.customer.findMany({ where, select: { id: true, name: true, email: true, phone: true, isActive: true, _count: { select: { requests: true, properties: { where: { isActive: true } } } } }, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize });
  return { items: rows.map((row) => ({ id: row.id, name: row.name, email: row.email, phone: row.phone, isActive: row.isActive, propertyCount: row._count.properties, requestCount: row._count.requests })), pagination: { page, pageSize, totalItems, totalPages } };
}

export type { PropertyType };
