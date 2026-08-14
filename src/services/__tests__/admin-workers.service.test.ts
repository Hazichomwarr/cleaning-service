/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWorkerWhere, getAdminWorkers } from "../admin-workers.service";

const rows = [{ id: "1", firstName: "Maria", lastName: "Lopez", phone: "+19735551234", email: "maria@example.com", type: "CREW", isActive: true, _count: { assignments: 3 } }, { id: "2", firstName: "John", lastName: "Smith", phone: null, email: "john@example.com", type: "CONTRACTOR", isActive: false, _count: { assignments: 0 } }];
describe("admin workers service", () => { it("builds normalized search and filters", () => { const where = buildWorkerWhere({ search: "(973) 555-1234", type: "CREW", status: "ACTIVE", page: 1 }); assert.equal((where as any).type, "CREW"); assert.equal((where as any).isActive, true); assert.equal((where as any).OR[3].phone.contains, "+19735551234"); }); it("returns safe DTOs with current assignment counts and pagination", async () => { const result = await getAdminWorkers({ search: "", type: "ALL", status: "ALL", page: 1 }, { pageSize: 1, database: { worker: { count: async () => 2, findMany: async () => rows.slice(0, 1) } } as any }); assert.equal(result.items[0].currentAssignmentCount, 3); assert.deepEqual(result.pagination, { page: 1, pageSize: 1, totalItems: 2, totalPages: 2 }); }); });
