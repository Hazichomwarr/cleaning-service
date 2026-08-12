import {
  CleaningEstimateOutcome,
  CleaningRequestStatus,
  type PropertyType,
} from "../generated/prisma/client";
import {
  ADMIN_CLEANING_REQUESTS_PAGE_SIZE,
  type AdminCleaningRequestsQuery,
  getNormalizedPhoneSearch,
} from "../lib/admin-cleaning-requests-query";

export type AdminCleaningRequestListItem = {
  id: string;
  requestNumber: string;
  customerName: string;
  serviceName: string;
  propertyType: PropertyType;
  status: CleaningRequestStatus;
  estimateOutcome: CleaningEstimateOutcome;
  estimatedPrice: string | null;
  preferredDate: string;
  preferredTimeWindow: string;
  scheduledStart: string | null;
  createdAt: string;
};

export type AdminCleaningRequestsResult = {
  items: AdminCleaningRequestListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type AdminCleaningRequestRow = {
  id: string;
  requestNumber: string;
  customerName: string;
  propertyType: PropertyType;
  status: CleaningRequestStatus;
  estimateOutcome: CleaningEstimateOutcome;
  estimatedPrice: { toFixed: (digits: number) => string } | null;
  preferredDate: Date;
  preferredTimeWindow: string;
  scheduledStart: Date | null;
  createdAt: Date;
  service: { name: string };
};

type AdminCleaningRequestsDatabase = {
  cleaningRequest: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
    findMany: (args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
      orderBy: Array<Record<string, string>>;
      skip: number;
      take: number;
    }) => Promise<AdminCleaningRequestRow[]>;
  };
};

export type AdminCleaningRequestsOptions = {
  database?: AdminCleaningRequestsDatabase;
  pageSize?: number;
};

const attentionOutcomes = [
  CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED,
  CleaningEstimateOutcome.NO_CONFIGURED_ESTIMATE,
  CleaningEstimateOutcome.ESTIMATE_UNAVAILABLE,
];

const requestSelect = {
  id: true,
  requestNumber: true,
  customerName: true,
  propertyType: true,
  status: true,
  estimateOutcome: true,
  estimatedPrice: true,
  preferredDate: true,
  preferredTimeWindow: true,
  scheduledStart: true,
  createdAt: true,
  service: { select: { name: true } },
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildWhere(query: AdminCleaningRequestsQuery): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [];
  if (query.status) conditions.push({ status: query.status });
  if (query.estimateAttention) conditions.push({ estimateOutcome: { in: attentionOutcomes } });

  if (query.search) {
    const phoneSearch = getNormalizedPhoneSearch(query.search);
    conditions.push({
      OR: [
        { requestNumber: { contains: query.search, mode: "insensitive" } },
        { customerName: { contains: query.search, mode: "insensitive" } },
        { customerEmail: { contains: query.search, mode: "insensitive" } },
        { customerPhone: { contains: phoneSearch ?? query.search } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function toListItem(row: AdminCleaningRequestRow): AdminCleaningRequestListItem {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    customerName: row.customerName,
    serviceName: row.service.name,
    propertyType: row.propertyType,
    status: row.status,
    estimateOutcome: row.estimateOutcome,
    estimatedPrice: row.estimatedPrice?.toFixed(2) ?? null,
    preferredDate: toDateOnly(row.preferredDate),
    preferredTimeWindow: row.preferredTimeWindow,
    scheduledStart: row.scheduledStart?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getDefaultDatabase(): Promise<AdminCleaningRequestsDatabase> {
  const { prisma } = await import("../lib/db/prisma");
  return prisma as unknown as AdminCleaningRequestsDatabase;
}

export async function getAdminCleaningRequests(
  query: AdminCleaningRequestsQuery,
  options: AdminCleaningRequestsOptions = {},
): Promise<AdminCleaningRequestsResult> {
  const database = options.database ?? await getDefaultDatabase();
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? ADMIN_CLEANING_REQUESTS_PAGE_SIZE));
  const where = buildWhere(query);
  const totalItems = await database.cleaningRequest.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(query.page, totalPages);
  const rows = await database.cleaningRequest.findMany({
    where,
    select: requestSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: rows.map(toListItem),
    pagination: { page, pageSize, totalItems, totalPages },
  };
}

export { attentionOutcomes, buildWhere, toListItem };
