import type { WorkerType } from "../generated/prisma/client";
import { normalizePhone } from "./cleaning-request-validation.service";
import { ADMIN_WORKERS_PAGE_SIZE, type AdminWorkersQuery } from "../lib/admin-workers-query";

export type AdminWorkerListItem = { id: string; firstName: string; lastName: string; phone: string | null; email: string | null; type: WorkerType; isActive: boolean; currentAssignmentCount: number };
export type AdminWorkersResult = { items: AdminWorkerListItem[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } };
type Row = { id: string; firstName: string; lastName: string; phone: string | null; email: string | null; type: WorkerType; isActive: boolean; _count: { assignments: number } };
type Database = { worker: { count: (args: { where: Record<string, unknown> }) => Promise<number>; findMany: (args: Record<string, unknown>) => Promise<Row[]> } };

export function buildWorkerWhere(query: AdminWorkersQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (query.type !== "ALL") where.type = query.type;
  if (query.status !== "ALL") where.isActive = query.status === "ACTIVE";
  if (query.search) { const phone = normalizePhone(query.search); where.OR = [{ firstName: { contains: query.search, mode: "insensitive" } }, { lastName: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }, { phone: { contains: phone ?? query.search } }]; }
  return where;
}

export async function getAdminWorkers(query: AdminWorkersQuery, options: { database?: Database; pageSize?: number } = {}): Promise<AdminWorkersResult> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database; const pageSize = Math.max(1, Math.floor(options.pageSize ?? ADMIN_WORKERS_PAGE_SIZE)); const where = buildWorkerWhere(query); const totalItems = await database.worker.count({ where }); const totalPages = Math.max(1, Math.ceil(totalItems / pageSize)); const page = Math.min(query.page, totalPages);
  const rows = await database.worker.findMany({ where, select: { id: true, firstName: true, lastName: true, phone: true, email: true, type: true, isActive: true, _count: { select: { assignments: true } } }, orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize });
  return { items: rows.map((row) => ({ id: row.id, firstName: row.firstName, lastName: row.lastName, phone: row.phone, email: row.email, type: row.type, isActive: row.isActive, currentAssignmentCount: row._count.assignments })), pagination: { page, pageSize, totalItems, totalPages } };
}
