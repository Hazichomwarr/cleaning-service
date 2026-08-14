import {
  CleaningEstimateOutcome,
  CleaningRequestStatus,
  type PropertyType,
  type WorkerType,
} from "../generated/prisma/client";
import type { CleaningRequestStatusHistoryItem } from "./cleaning-request-lifecycle.service";
import type { CleaningRequestPriceHistoryItem } from "./cleaning-request-price.service";
import type { CleaningRequestScheduleHistoryItem } from "./cleaning-request-schedule.service";
import { getCleaningRequestConfirmationReadiness, type ConfirmationReadiness } from "../lib/cleaning-request-confirmation";

export type AdminCleaningRequestDetail = {
  id: string;
  requestNumber: string;
  status: CleaningRequestStatus;
  customer: { name: string; email: string; phone: string };
  service: { id: string; name: string; slug: string };
  property: { type: PropertyType; bedrooms: number | null; bathrooms: string | null; approximateSquareFeet: number | null };
  address: { line1: string; line2: string | null; city: string; state: string; postalCode: string };
  extras: Array<{ id: string; name: string }>;
  customerNotes: string | null;
  internalNotes: string | null;
  estimate: { outcome: CleaningEstimateOutcome; estimatedPrice: string | null; confirmedPrice: string | null };
  preferredSchedule: { date: string; timeWindow: string };
  confirmedSchedule: { start: string | null; end: string | null } | null;
  assignments: Array<{ id: string; workerId: string; workerName: string; workerType: WorkerType; assignedAt: string }>;
  cancellation: { cancelledAt: string | null; reason: string | null } | null;
  statusHistory: CleaningRequestStatusHistoryItem[];
  priceHistory: CleaningRequestPriceHistoryItem[];
  scheduleHistory: CleaningRequestScheduleHistoryItem[];
  confirmationReadiness: ConfirmationReadiness;
  createdAt: string;
  updatedAt: string;
};

type DetailDatabaseRow = {
  id: string;
  requestNumber: string;
  status: CleaningRequestStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: { toString: () => string } | null;
  approximateSquareFeet: number | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  preferredDate: Date;
  preferredTimeWindow: string;
  estimatedPrice: { toFixed: (digits: number) => string } | null;
  estimateOutcome: CleaningEstimateOutcome;
  confirmedPrice: { toFixed: (digits: number) => string; gt: (value: number) => boolean } | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  customerNotes: string | null;
  internalNotes: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  service: { id: string; name: string; slug: string };
  requestExtras: Array<{ cleaningExtra: { id: string; name: string; displayOrder: number } }>;
  assignments: Array<{ id: string; workerId: string; assignedAt: Date; worker: { firstName: string; lastName: string; type: WorkerType } }>;
  statusHistory: Array<{
    id: string;
    fromStatus: CleaningRequestStatus;
    toStatus: CleaningRequestStatus;
    reason: string | null;
    createdAt: Date;
    changedByAdminUser: { id: string; name: string; email: string };
  }>;
  priceHistory: Array<{
    id: string;
    previousConfirmedPrice: { toFixed: (digits: number) => string } | null;
    newConfirmedPrice: { toFixed: (digits: number) => string };
    reason: string | null;
    createdAt: Date;
    changedByAdminUser: { id: string; name: string; email: string };
  }>;
  scheduleHistory: Array<{
    id: string;
    previousScheduledStart: Date | null;
    previousScheduledEnd: Date | null;
    newScheduledStart: Date;
    newScheduledEnd: Date;
    reason: string | null;
    createdAt: Date;
    changedByAdminUser: { id: string; name: string; email: string };
  }>;
};

type DetailDatabase = {
  cleaningRequest: {
    findUnique: (args: { where: { id: string }; select: Record<string, unknown> }) => Promise<DetailDatabaseRow | null>;
  };
};

export type AdminCleaningRequestDetailOptions = { database?: DetailDatabase };

const detailSelect = {
  id: true,
  requestNumber: true,
  status: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  propertyType: true,
  bedrooms: true,
  bathrooms: true,
  approximateSquareFeet: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  preferredDate: true,
  preferredTimeWindow: true,
  estimatedPrice: true,
  estimateOutcome: true,
  confirmedPrice: true,
  scheduledStart: true,
  scheduledEnd: true,
  customerNotes: true,
  internalNotes: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  service: { select: { id: true, name: true, slug: true } },
  requestExtras: { select: { cleaningExtra: { select: { id: true, name: true, displayOrder: true } } } },
  assignments: { select: { id: true, workerId: true, assignedAt: true, worker: { select: { firstName: true, lastName: true, type: true } } } },
  statusHistory: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
      changedByAdminUser: { select: { id: true, name: true, email: true } },
    },
  },
  priceHistory: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      previousConfirmedPrice: true,
      newConfirmedPrice: true,
      reason: true,
      createdAt: true,
      changedByAdminUser: { select: { id: true, name: true, email: true } },
    },
  },
  scheduleHistory: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      previousScheduledStart: true,
      previousScheduledEnd: true,
      newScheduledStart: true,
      newScheduledEnd: true,
      reason: true,
      createdAt: true,
      changedByAdminUser: { select: { id: true, name: true, email: true } },
    },
  },
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toMoney(value: { toFixed: (digits: number) => string } | null): string | null {
  return value?.toFixed(2) ?? null;
}

function toDetail(row: DetailDatabaseRow): AdminCleaningRequestDetail {
  const hasSchedule = row.scheduledStart !== null || row.scheduledEnd !== null;
  const hasCancellation = row.status === CleaningRequestStatus.CANCELLED || row.cancelledAt !== null;
  const confirmationReadiness = getCleaningRequestConfirmationReadiness({ status: row.status, confirmedPrice: row.confirmedPrice, scheduledStart: row.scheduledStart, scheduledEnd: row.scheduledEnd });
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    status: row.status,
    customer: { name: row.customerName, email: row.customerEmail, phone: row.customerPhone },
    service: row.service,
    property: { type: row.propertyType, bedrooms: row.bedrooms, bathrooms: row.bathrooms?.toString() ?? null, approximateSquareFeet: row.approximateSquareFeet },
    address: { line1: row.addressLine1, line2: row.addressLine2, city: row.city, state: row.state, postalCode: row.postalCode },
    extras: row.requestExtras
      .sort((left, right) => left.cleaningExtra.displayOrder - right.cleaningExtra.displayOrder || left.cleaningExtra.name.localeCompare(right.cleaningExtra.name))
      .map(({ cleaningExtra }) => ({ id: cleaningExtra.id, name: cleaningExtra.name })),
    customerNotes: row.customerNotes,
    internalNotes: row.internalNotes,
    estimate: { outcome: row.estimateOutcome, estimatedPrice: toMoney(row.estimatedPrice), confirmedPrice: toMoney(row.confirmedPrice) },
    preferredSchedule: { date: toDateOnly(row.preferredDate), timeWindow: row.preferredTimeWindow },
    confirmedSchedule: hasSchedule ? { start: row.scheduledStart?.toISOString() ?? null, end: row.scheduledEnd?.toISOString() ?? null } : null,
    assignments: row.assignments
      .sort((left, right) => left.assignedAt.getTime() - right.assignedAt.getTime() || `${left.worker.lastName} ${left.worker.firstName}`.localeCompare(`${right.worker.lastName} ${right.worker.firstName}`))
      .map((assignment) => ({ id: assignment.id, workerId: assignment.workerId, workerName: `${assignment.worker.firstName} ${assignment.worker.lastName}`, workerType: assignment.worker.type, assignedAt: assignment.assignedAt.toISOString() })),
    cancellation: hasCancellation ? { cancelledAt: row.cancelledAt?.toISOString() ?? null, reason: row.cancellationReason } : null,
    statusHistory: row.statusHistory
      .slice()
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
      .map((history) => ({
        id: history.id,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        reason: history.reason,
        changedAt: history.createdAt.toISOString(),
        changedBy: history.changedByAdminUser,
      })),
    priceHistory: row.priceHistory
      .slice()
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
      .map((history) => ({
        id: history.id,
        previousConfirmedPrice: history.previousConfirmedPrice?.toFixed(2) ?? null,
        newConfirmedPrice: history.newConfirmedPrice.toFixed(2),
        reason: history.reason,
        changedAt: history.createdAt.toISOString(),
        changedBy: history.changedByAdminUser,
      })),
    scheduleHistory: row.scheduleHistory
      .slice()
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
      .map((history) => ({
        id: history.id,
        previousScheduledStart: history.previousScheduledStart?.toISOString() ?? null,
        previousScheduledEnd: history.previousScheduledEnd?.toISOString() ?? null,
        newScheduledStart: history.newScheduledStart.toISOString(),
        newScheduledEnd: history.newScheduledEnd.toISOString(),
        reason: history.reason,
        changedAt: history.createdAt.toISOString(),
        changedBy: history.changedByAdminUser,
      })),
    confirmationReadiness,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getDefaultDatabase(): Promise<DetailDatabase> {
  const { prisma } = await import("../lib/db/prisma");
  return prisma as unknown as DetailDatabase;
}

export async function getAdminCleaningRequestDetail(id: string, options: AdminCleaningRequestDetailOptions = {}): Promise<AdminCleaningRequestDetail | null> {
  const database = options.database ?? await getDefaultDatabase();
  const row = await database.cleaningRequest.findUnique({ where: { id }, select: detailSelect });
  return row ? toDetail(row) : null;
}

export { detailSelect, toDetail };
