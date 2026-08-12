import { CleaningRequestStatus } from "../generated/prisma/client";

export const ADMIN_CLEANING_REQUESTS_PAGE_SIZE = 20;

const validStatuses = new Set<CleaningRequestStatus>(Object.values(CleaningRequestStatus));

export type AdminCleaningRequestsSearchParams = Record<string, string | string[] | undefined>;

export type AdminCleaningRequestsQuery = {
  search: string;
  status?: CleaningRequestStatus;
  estimateAttention: boolean;
  page: number;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePage(value: string): number {
  if (!/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function normalizePhoneSearch(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function parseAdminCleaningRequestsQuery(input: AdminCleaningRequestsSearchParams = {}): AdminCleaningRequestsQuery {
  const search = firstValue(input.search).trim();
  const rawStatus = firstValue(input.status).trim().toUpperCase();
  const status = validStatuses.has(rawStatus as CleaningRequestStatus) ? rawStatus as CleaningRequestStatus : undefined;
  const rawAttention = firstValue(input.estimateAttention).trim().toLowerCase();

  return {
    search,
    status,
    estimateAttention: rawAttention === "true" || rawAttention === "1",
    page: parsePage(firstValue(input.page)),
  };
}

export function getNormalizedPhoneSearch(value: string): string | null {
  return normalizePhoneSearch(value);
}
