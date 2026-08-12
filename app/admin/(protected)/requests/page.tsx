import Link from "next/link";
import { CleaningRequestStatus, type PropertyType } from "@/src/generated/prisma/client";
import { parseAdminCleaningRequestsQuery, type AdminCleaningRequestsSearchParams } from "@/src/lib/admin-cleaning-requests-query";
import { getEstimateConfirmationPresentation, formatTimeWindow } from "@/src/lib/request-confirmation";
import { getAdminCleaningRequests, type AdminCleaningRequestListItem } from "@/src/services/admin-cleaning-requests.service";

const statusLabels: Record<CleaningRequestStatus, string> = {
  NEW: "New", REVIEWING: "Reviewing", CONFIRMED: "Confirmed", ASSIGNED: "Assigned", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
const propertyLabels: Record<PropertyType, string> = {
  HOUSE: "House", APARTMENT: "Apartment", OFFICE: "Office", COMMERCIAL: "Commercial space", AIRBNB: "Airbnb / Short-term rental", OTHER: "Other",
};
const statusOptions: Array<{ value: "ALL" | CleaningRequestStatus; label: string }> = [
  { value: "ALL", label: "All statuses" },
  ...Object.values(CleaningRequestStatus).map((value) => ({ value, label: statusLabels[value] })),
];

function formatPreferredDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value));
}

function formatEstimate(item: AdminCleaningRequestListItem): { label: string; value: string } {
  const presentation = getEstimateConfirmationPresentation({ outcome: item.estimateOutcome, amount: item.estimatedPrice, currency: "USD" });
  return { label: presentation.amount ? presentation.label : "Needs review", value: presentation.amount ?? "Estimate review" };
}

function StatusBadge({ status }: { status: CleaningRequestStatus }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabels[status]}</span>;
}

function RequestMeta({ item }: { item: AdminCleaningRequestListItem }) {
  return <><p className="mt-1 text-sm text-slate-600">{item.serviceName} <span className="text-slate-400">·</span> {propertyLabels[item.propertyType]}</p><p className="mt-2 text-sm text-slate-500"><span className="font-medium text-slate-600">Preferred:</span> {formatPreferredDate(item.preferredDate)} · {formatTimeWindow(item.preferredTimeWindow)}</p></>;
}

function FilterForm({ query }: { query: ReturnType<typeof parseAdminCleaningRequestsQuery> }) {
  const hasFilters = Boolean(query.search || query.status || query.estimateAttention);
  return <form method="get" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_auto] lg:items-end">
      <div><label htmlFor="request-search" className="text-sm font-semibold text-slate-700">Search requests</label><input id="request-search" name="search" type="search" defaultValue={query.search} placeholder="Request number, customer, email, or phone" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
      <div><label htmlFor="request-status" className="text-sm font-semibold text-slate-700">Status</label><select id="request-status" name="status" defaultValue={query.status ?? "ALL"} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
      <button type="submit" className="min-h-11 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Apply filters</button>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-4"><label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" name="estimateAttention" value="true" defaultChecked={query.estimateAttention} className="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500" />Needs estimate review</label>{hasFilters ? <Link href="/admin/requests" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Clear filters</Link> : null}</div>
  </form>;
}

function queryHref(query: ReturnType<typeof parseAdminCleaningRequestsQuery>, page: number): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.estimateAttention) params.set("estimateAttention", "true");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/requests?${search}` : "/admin/requests";
}

function EmptyState({ query }: { query: ReturnType<typeof parseAdminCleaningRequestsQuery> }) {
  const hasFilter = Boolean(query.search || query.status || query.estimateAttention);
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h2 className="text-lg font-semibold text-slate-950">{query.search ? `No requests found for “${query.search}”.` : hasFilter ? "No requests match these filters." : "No cleaning requests yet."}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{hasFilter ? "Try adjusting your search or filters." : "New customer requests will appear here."}</p>{hasFilter ? <Link href="/admin/requests" className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-800">Clear filters</Link> : null}</div>;
}

function RequestCard({ item }: { item: AdminCleaningRequestListItem }) {
  const estimate = formatEstimate(item);
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">{item.requestNumber}</p><h2 className="mt-2 font-semibold text-slate-950">{item.customerName}</h2></div><StatusBadge status={item.status} /></div><RequestMeta item={item} /><div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-100 pt-4"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{estimate.label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{estimate.value}</p></div><Link href={`/admin/requests/${item.id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">View request <span aria-hidden="true">→</span></Link></div></article>;
}

function RequestsPagination({ query, page, totalPages }: { query: ReturnType<typeof parseAdminCleaningRequestsQuery>; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return <nav aria-label="Request list pagination" className="flex items-center justify-between gap-4"><div className="text-sm text-slate-500">Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span></div><div className="flex gap-2">{page > 1 ? <Link href={queryHref(query, page - 1)} aria-label="Previous page" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-800">Previous</Link> : <span aria-disabled="true" className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-300">Previous</span>}{page < totalPages ? <Link href={queryHref(query, page + 1)} aria-label="Next page" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-800">Next</Link> : <span aria-disabled="true" className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-300">Next</span>}</div></nav>;
}

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<AdminCleaningRequestsSearchParams> }) {
  const query = parseAdminCleaningRequestsQuery(await searchParams);
  const result = await getAdminCleaningRequests(query);
  return <div className="mx-auto max-w-7xl"><header><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Requests</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Cleaning requests</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Browse incoming requests, find a customer, and open the next request to review.</p></header><div className="mt-8"><FilterForm query={query} /></div><div className="mt-6 flex items-center justify-between gap-4"><p className="text-sm text-slate-500"><span className="font-semibold text-slate-800">{result.pagination.totalItems}</span> {result.pagination.totalItems === 1 ? "request" : "requests"}</p>{query.status || query.estimateAttention ? <p className="text-sm text-slate-500">Filtered view</p> : null}</div>{result.items.length === 0 ? <div className="mt-4"><EmptyState query={query} /></div> : <><div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><caption className="sr-only">Cleaning requests</caption><thead className="border-b border-slate-200 bg-slate-50"><tr><th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Request</th><th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Customer</th><th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Service</th><th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Preferred</th><th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Estimate</th><th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Status</th><th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Created</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead><tbody className="divide-y divide-slate-100">{result.items.map((item) => { const estimate = formatEstimate(item); return <tr key={item.id} className="align-top"><td className="px-5 py-5"><p className="text-sm font-bold text-blue-700">{item.requestNumber}</p></td><td className="px-5 py-5"><p className="font-semibold text-slate-950">{item.customerName}</p></td><td className="px-5 py-5"><p className="font-semibold text-slate-800">{item.serviceName}</p><p className="mt-1 text-sm text-slate-500">{propertyLabels[item.propertyType]}</p></td><td className="px-5 py-5"><p className="text-sm font-medium text-slate-700">{formatPreferredDate(item.preferredDate)}</p><p className="mt-1 text-sm text-slate-500">{formatTimeWindow(item.preferredTimeWindow)}</p></td><td className="px-5 py-5"><p className="text-sm font-semibold text-slate-800">{estimate.value}</p><p className="mt-1 text-xs text-slate-500">{estimate.label}</p></td><td className="px-5 py-5"><StatusBadge status={item.status} /></td><td className="whitespace-nowrap px-5 py-5 text-sm text-slate-500">{formatCreatedAt(item.createdAt)}</td><td className="px-5 py-5 text-right"><Link href={`/admin/requests/${item.id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">View</Link></td></tr>; })}</tbody></table></div></div><div className="mt-4 grid gap-4 md:hidden">{result.items.map((item) => <RequestCard key={item.id} item={item} />)}</div><div className="mt-6"><RequestsPagination query={query} page={result.pagination.page} totalPages={result.pagination.totalPages} /></div></>}</div>;
}
