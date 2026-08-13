export const ADMIN_CUSTOMERS_PAGE_SIZE = 20;

export type AdminCustomersQuery = { search: string; page: number };
export type AdminCustomersSearchParams = { search?: string | string[]; page?: string | string[] };

function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }

export function parseAdminCustomersQuery(params: AdminCustomersSearchParams = {}): AdminCustomersQuery {
  const search = first(params.search)?.trim() ?? "";
  const rawPage = first(params.page);
  const page = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  return { search, page: Number.isInteger(page) && page > 0 ? page : 1 };
}
