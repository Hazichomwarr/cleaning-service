import { CleaningAssignmentHistoryAction, CleaningRequestStatus, Prisma, WorkerType, type PropertyType } from "../generated/prisma/client";
import { isWorkerEligibleForProperty, getEligibleWorkerTypes } from "../lib/cleaning-request-worker-eligibility";
import { AssignWorkerInputSchema, RemoveWorkerInputSchema } from "../lib/validations/cleaning-request-assignment.schema";
import { transitionCleaningRequestStatusInTransaction, type LifecycleTransaction } from "./cleaning-request-lifecycle.service";

type WorkerRow = { id: string; firstName: string; lastName: string; type: WorkerType; isActive: boolean };
type AssignmentRow = { id: string; workerId: string; assignedAt: Date; worker: WorkerRow };
type RequestRow = { id: string; requestNumber: string; status: CleaningRequestStatus; propertyType: PropertyType; assignments: AssignmentRow[] };
type AssignmentHistoryRow = { id: string; action: CleaningAssignmentHistoryAction; reason: string | null; createdAt: Date; worker: WorkerRow; changedByAdminUser: { id: string; name: string; email: string } };
type AssignmentTransaction = Omit<LifecycleTransaction, "cleaningRequest"> & { cleaningRequest: { findUnique: (args: Record<string, unknown>) => Promise<RequestRow | null>; updateMany: LifecycleTransaction["cleaningRequest"]["updateMany"] }; cleaningAssignment: { findUnique: (args: Record<string, unknown>) => Promise<AssignmentRow | null>; findMany: (args: Record<string, unknown>) => Promise<AssignmentRow[]>; create: (args: Record<string, unknown>) => Promise<AssignmentRow>; deleteMany: (args: Record<string, unknown>) => Promise<{ count: number }> }; worker: { findUnique: (args: Record<string, unknown>) => Promise<WorkerRow | null> }; cleaningRequestAssignmentHistory: { create: (args: Record<string, unknown>) => Promise<unknown> } };
type Database = { $transaction: <T>(callback: (transaction: AssignmentTransaction) => Promise<T>) => Promise<T>; cleaningRequest: { findUnique: (args: Record<string, unknown>) => Promise<RequestRow | null> }; worker: { findMany: (args: Record<string, unknown>) => Promise<WorkerRow[]> }; cleaningRequestAssignmentHistory: { findMany: (args: Record<string, unknown>) => Promise<AssignmentHistoryRow[]> } };

type AssignmentFailure = "INVALID_INPUT" | "REQUEST_NOT_FOUND" | "WORKER_NOT_FOUND" | "WORKER_INACTIVE" | "WORKER_NOT_ELIGIBLE" | "WORKER_ALREADY_ASSIGNED" | "ASSIGNMENT_NOT_FOUND" | "INVALID_REQUEST_STATUS" | "REMOVAL_REASON_REQUIRED" | "ASSIGNMENT_CONFLICT" | "STATUS_CONFLICT" | "INTERNAL_ERROR";
export type CleaningRequestAssignmentResult = { success: true; request: { id: string; requestNumber: string; status: CleaningRequestStatus }; assignment: { id: string; workerId: string; assignedAt: string }; action: CleaningAssignmentHistoryAction } | { success: false; reason: AssignmentFailure };
export type CleaningRequestAssignmentHistoryItem = { id: string; action: CleaningAssignmentHistoryAction; worker: { id: string; name: string; type: WorkerType }; changedBy: { id: string; name: string; email: string }; reason: string | null; changedAt: string };
export type EligibleWorker = { id: string; name: string; type: WorkerType; isActive: boolean };

class AssignmentOperationError extends Error { constructor(public readonly reason: AssignmentFailure) { super(reason); } }

function mapWorker(worker: WorkerRow): EligibleWorker { return { id: worker.id, name: `${worker.firstName} ${worker.lastName}`, type: worker.type, isActive: worker.isActive }; }
function mapFailure(error: unknown): AssignmentFailure { if (error instanceof AssignmentOperationError) return error.reason; if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "WORKER_ALREADY_ASSIGNED"; return "INTERNAL_ERROR"; }

async function loadRequestAndWorker(transaction: AssignmentTransaction, requestId: string, workerId: string): Promise<{ request: RequestRow; worker: WorkerRow } | { failure: AssignmentFailure }> {
  const request = await transaction.cleaningRequest.findUnique({ where: { id: requestId }, select: { id: true, requestNumber: true, status: true, propertyType: true, assignments: { select: { id: true, workerId: true, assignedAt: true, worker: { select: { id: true, firstName: true, lastName: true, type: true, isActive: true } } } } } });
  if (!request) return { failure: "REQUEST_NOT_FOUND" };
  const worker = await transaction.worker.findUnique({ where: { id: workerId }, select: { id: true, firstName: true, lastName: true, type: true, isActive: true } });
  if (!worker) return { failure: "WORKER_NOT_FOUND" };
  return { request, worker };
}

export async function assignWorkerToCleaningRequestForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date } = {}): Promise<CleaningRequestAssignmentResult> {
  const parsed = AssignWorkerInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const now = options.now ?? new Date();
  try {
    return await database.$transaction(async (transaction) => {
      const loaded = await loadRequestAndWorker(transaction, parsed.data.cleaningRequestId, parsed.data.workerId);
      if ("failure" in loaded) return { success: false, reason: loaded.failure };
      const { request, worker } = loaded;
      if (request.status !== CleaningRequestStatus.CONFIRMED && request.status !== CleaningRequestStatus.ASSIGNED) return { success: false, reason: "INVALID_REQUEST_STATUS" };
      if (!worker.isActive) return { success: false, reason: "WORKER_INACTIVE" };
      if (!isWorkerEligibleForProperty(request.propertyType, worker.type)) return { success: false, reason: "WORKER_NOT_ELIGIBLE" };
      if (request.assignments.some((assignment) => assignment.workerId === worker.id)) return { success: false, reason: "WORKER_ALREADY_ASSIGNED" };
      const assignment = await transaction.cleaningAssignment.create({ data: { cleaningRequestId: request.id, workerId: worker.id, assignedAt: now }, select: { id: true, workerId: true, assignedAt: true } });
      await transaction.cleaningRequestAssignmentHistory.create({ data: { cleaningRequestId: request.id, workerId: worker.id, action: CleaningAssignmentHistoryAction.ASSIGNED, changedByAdminUserId: adminId, reason: parsed.data.reason ?? null, createdAt: now } });
      let status: CleaningRequestStatus = request.status;
      if (request.status === CleaningRequestStatus.CONFIRMED) {
        const transition = await transitionCleaningRequestStatusInTransaction(adminId, transaction, { id: request.id, requestNumber: request.requestNumber, status: request.status }, CleaningRequestStatus.ASSIGNED, null, now);
        if (!transition.success) throw new AssignmentOperationError(transition.reason === "STATUS_CONFLICT" ? "STATUS_CONFLICT" : "INTERNAL_ERROR");
        status = transition.request.status;
      }
      return { success: true, request: { id: request.id, requestNumber: request.requestNumber, status }, assignment: { id: assignment.id, workerId: assignment.workerId, assignedAt: assignment.assignedAt.toISOString() }, action: CleaningAssignmentHistoryAction.ASSIGNED };
    });
  } catch (error) { return { success: false, reason: mapFailure(error) }; }
}

export async function removeWorkerFromCleaningRequestForAdmin(adminId: string, input: unknown, options: { database?: Database; now?: Date } = {}): Promise<CleaningRequestAssignmentResult> {
  const parsed = RemoveWorkerInputSchema.safeParse(input);
  if (!parsed.success || !parsed.data.reason) return { success: false, reason: parsed.success ? "REMOVAL_REASON_REQUIRED" : "INVALID_INPUT" };
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const now = options.now ?? new Date();
  try {
    return await database.$transaction(async (transaction) => {
      const loaded = await loadRequestAndWorker(transaction, parsed.data.cleaningRequestId, parsed.data.workerId);
      if ("failure" in loaded) return { success: false, reason: loaded.failure };
      const { request, worker } = loaded;
      if (request.status !== CleaningRequestStatus.ASSIGNED) return { success: false, reason: "INVALID_REQUEST_STATUS" };
      const current = request.assignments.find((assignment) => assignment.workerId === worker.id);
      if (!current) return { success: false, reason: "ASSIGNMENT_NOT_FOUND" };
      const removingLastWorker = request.assignments.length === 1;
      const deleted = await transaction.cleaningAssignment.deleteMany({ where: { id: current.id, cleaningRequestId: request.id, workerId: worker.id } });
      if (deleted.count !== 1) throw new AssignmentOperationError("ASSIGNMENT_CONFLICT");
      await transaction.cleaningRequestAssignmentHistory.create({ data: { cleaningRequestId: request.id, workerId: worker.id, action: CleaningAssignmentHistoryAction.REMOVED, changedByAdminUserId: adminId, reason: parsed.data.reason, createdAt: now } });
      let status: CleaningRequestStatus = request.status;
      if (removingLastWorker) {
        const transition = await transitionCleaningRequestStatusInTransaction(adminId, transaction, { id: request.id, requestNumber: request.requestNumber, status: request.status }, CleaningRequestStatus.CONFIRMED, null, now, { allowAssignmentRollback: true });
        if (!transition.success) throw new AssignmentOperationError(transition.reason === "STATUS_CONFLICT" ? "STATUS_CONFLICT" : "INTERNAL_ERROR");
        status = transition.request.status;
      }
      return { success: true, request: { id: request.id, requestNumber: request.requestNumber, status }, assignment: { id: current.id, workerId: current.workerId, assignedAt: current.assignedAt.toISOString() }, action: CleaningAssignmentHistoryAction.REMOVED };
    });
  } catch (error) { return { success: false, reason: mapFailure(error) }; }
}

export async function getEligibleWorkersForCleaningRequest(requestId: string, options: { database?: Database } = {}): Promise<EligibleWorker[]> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const request = await database.cleaningRequest.findUnique({ where: { id: requestId }, select: { status: true, propertyType: true, assignments: { select: { workerId: true } } } });
  if (!request) return [];
  if (request.status !== CleaningRequestStatus.CONFIRMED && request.status !== CleaningRequestStatus.ASSIGNED) return [];
  const assigned = new Set(request.assignments.map((assignment) => assignment.workerId));
  const workers = await database.worker.findMany({ where: { isActive: true, type: { in: getEligibleWorkerTypes(request.propertyType) }, id: { notIn: [...assigned] } }, orderBy: [{ type: "asc" }, { lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true, type: true, isActive: true } });
  return workers.sort((left, right) => getEligibleWorkerTypes(request.propertyType).indexOf(left.type) - getEligibleWorkerTypes(request.propertyType).indexOf(right.type) || left.lastName.localeCompare(right.lastName) || left.firstName.localeCompare(right.firstName)).map(mapWorker);
}

export async function getCleaningRequestAssignmentHistory(requestId: string, options: { database?: Database } = {}): Promise<CleaningRequestAssignmentHistoryItem[]> {
  const database = options.database ?? (await import("../lib/db/prisma")).prisma as unknown as Database;
  const rows = await database.cleaningRequestAssignmentHistory.findMany({ where: { cleaningRequestId: requestId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, action: true, reason: true, createdAt: true, worker: { select: { id: true, firstName: true, lastName: true, type: true, isActive: true } }, changedByAdminUser: { select: { id: true, name: true, email: true } } } });
  return rows.map((row) => ({ id: row.id, action: row.action, worker: { id: row.worker.id, name: `${row.worker.firstName} ${row.worker.lastName}`, type: row.worker.type }, changedBy: row.changedByAdminUser, reason: row.reason, changedAt: row.createdAt.toISOString() }));
}
