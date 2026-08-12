import {
  CleaningEstimateOutcome,
  CleaningRequestStatus,
  type PropertyType,
} from "../generated/prisma/client";

export const ADMIN_DASHBOARD_TIME_ZONE = "America/New_York";
export const ADMIN_DASHBOARD_PREVIEW_LIMIT = 5;

export type AdminDashboardRequestItem = {
  id: string;
  requestNumber: string;
  customerName: string;
  serviceName: string;
  propertyType: PropertyType;
  bedrooms: number | null;
  status: CleaningRequestStatus;
  estimateOutcome: CleaningEstimateOutcome;
  estimatedPrice: string | null;
  preferredDate: string;
  preferredTimeWindow: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string;
};

export type AdminDashboardOverview = {
  counts: {
    newRequests: number;
    todayScheduled: number;
    upcomingScheduled: number;
  };
  needsAttention: AdminDashboardRequestItem[];
  todaysCleanings: AdminDashboardRequestItem[];
  recentRequests: AdminDashboardRequestItem[];
};

type DashboardDatabaseRow = {
  id: string;
  requestNumber: string;
  customerName: string;
  propertyType: PropertyType;
  bedrooms: number | null;
  status: CleaningRequestStatus;
  estimateOutcome: CleaningEstimateOutcome;
  estimatedPrice: { toFixed: (digits: number) => string } | null;
  preferredDate: Date;
  preferredTimeWindow: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  createdAt: Date;
  service: { name: string };
};

type DashboardDatabase = {
  cleaningRequest: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
    findMany: (args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
      orderBy: Record<string, string>;
      take: number;
    }) => Promise<DashboardDatabaseRow[]>;
  };
};

export type AdminDashboardOverviewOptions = {
  database?: DashboardDatabase;
  now?: Date;
  previewLimit?: number;
};

type CalendarDate = { year: number; month: number; day: number };

const requestSelect = {
  id: true,
  requestNumber: true,
  customerName: true,
  propertyType: true,
  bedrooms: true,
  status: true,
  estimateOutcome: true,
  estimatedPrice: true,
  preferredDate: true,
  preferredTimeWindow: true,
  scheduledStart: true,
  scheduledEnd: true,
  createdAt: true,
  service: { select: { name: true } },
};

function getCalendarDate(value: Date, timeZone = ADMIN_DASHBOARD_TIME_ZONE): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day };
}

function getTimeZoneOffsetMilliseconds(value: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - value.getTime();
}

function zonedMidnightToUtc(date: CalendarDate, timeZone = ADMIN_DASHBOARD_TIME_ZONE): Date {
  const localAsUtc = Date.UTC(date.year, date.month - 1, date.day);
  let result = new Date(localAsUtc - getTimeZoneOffsetMilliseconds(new Date(localAsUtc), timeZone));
  const correctedOffset = getTimeZoneOffsetMilliseconds(result, timeZone);
  if (correctedOffset !== getTimeZoneOffsetMilliseconds(new Date(localAsUtc), timeZone)) {
    result = new Date(localAsUtc - correctedOffset);
  }
  return result;
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
}

export function getBusinessDayBounds(now: Date): { start: Date; end: Date } {
  const today = getCalendarDate(now);
  return {
    start: zonedMidnightToUtc(today),
    end: zonedMidnightToUtc(addCalendarDays(today, 1)),
  };
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDashboardRequestItem(row: DashboardDatabaseRow): AdminDashboardRequestItem {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    customerName: row.customerName,
    serviceName: row.service.name,
    propertyType: row.propertyType,
    bedrooms: row.bedrooms,
    status: row.status,
    estimateOutcome: row.estimateOutcome,
    estimatedPrice: row.estimatedPrice?.toFixed(2) ?? null,
    preferredDate: toDateOnly(row.preferredDate),
    preferredTimeWindow: row.preferredTimeWindow,
    scheduledStart: row.scheduledStart?.toISOString() ?? null,
    scheduledEnd: row.scheduledEnd?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getDefaultDatabase(): Promise<DashboardDatabase> {
  const { prisma } = await import("../lib/db/prisma");
  return prisma as unknown as DashboardDatabase;
}

export async function getAdminDashboardOverview(options: AdminDashboardOverviewOptions = {}): Promise<AdminDashboardOverview> {
  const database = options.database ?? await getDefaultDatabase();
  const previewLimit = Math.max(1, Math.floor(options.previewLimit ?? ADMIN_DASHBOARD_PREVIEW_LIMIT));
  const { start, end } = getBusinessDayBounds(options.now ?? new Date());
  const scheduledStatus = { not: CleaningRequestStatus.CANCELLED };
  const scheduledToday = { scheduledStart: { gte: start, lt: end }, status: scheduledStatus };
  const scheduledUpcoming = { scheduledStart: { gte: end }, status: scheduledStatus };
  const reviewAttentionWhere = {
    status: CleaningRequestStatus.REVIEWING,
    estimateOutcome: { in: [
      CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED,
      CleaningEstimateOutcome.NO_CONFIGURED_ESTIMATE,
      CleaningEstimateOutcome.ESTIMATE_UNAVAILABLE,
    ] },
  };

  const [newRequests, todayScheduled, upcomingScheduled, newAttentionRows, reviewAttentionRows, todayRows, recentRows] = await Promise.all([
    database.cleaningRequest.count({ where: { status: CleaningRequestStatus.NEW } }),
    database.cleaningRequest.count({ where: scheduledToday }),
    database.cleaningRequest.count({ where: scheduledUpcoming }),
    database.cleaningRequest.findMany({ where: { status: CleaningRequestStatus.NEW }, select: requestSelect, orderBy: { createdAt: "asc" }, take: previewLimit }),
    database.cleaningRequest.findMany({ where: reviewAttentionWhere, select: requestSelect, orderBy: { createdAt: "asc" }, take: previewLimit }),
    database.cleaningRequest.findMany({ where: scheduledToday, select: requestSelect, orderBy: { scheduledStart: "asc" }, take: previewLimit }),
    database.cleaningRequest.findMany({ where: {}, select: requestSelect, orderBy: { createdAt: "desc" }, take: previewLimit }),
  ]);

  const attention = [...newAttentionRows, ...reviewAttentionRows]
    .sort((left, right) => {
      const priority = (status: CleaningRequestStatus) => status === CleaningRequestStatus.NEW ? 0 : 1;
      return priority(left.status) - priority(right.status) || left.createdAt.getTime() - right.createdAt.getTime();
    })
    .slice(0, previewLimit)
    .map(toDashboardRequestItem);

  return {
    counts: { newRequests, todayScheduled, upcomingScheduled },
    needsAttention: attention,
    todaysCleanings: todayRows.map(toDashboardRequestItem),
    recentRequests: recentRows.map(toDashboardRequestItem),
  };
}

export { toDashboardRequestItem };
