export const ADMIN_WORKERS_PAGE_SIZE = 20;
export type AdminWorkersQuery = { search: string; type: "ALL" | "CREW" | "CONTRACTOR"; status: "ALL" | "ACTIVE" | "INACTIVE"; page: number };
export type AdminWorkersSearchParams = { search?: string | string[]; type?: string | string[]; status?: string | string[]; page?: string | string[] };

function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
export function parseAdminWorkersQuery(params: AdminWorkersSearchParams = {}): AdminWorkersQuery {
  const rawType = first(params.type); const rawStatus = first(params.status); const rawPage = first(params.page);
  const page = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  return { search: first(params.search)?.trim() ?? "", type: rawType === "CREW" || rawType === "CONTRACTOR" ? rawType : "ALL", status: rawStatus === "ACTIVE" || rawStatus === "INACTIVE" ? rawStatus : "ALL", page: Number.isInteger(page) && page > 0 ? page : 1 };
}
