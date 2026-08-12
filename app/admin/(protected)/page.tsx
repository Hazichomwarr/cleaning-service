import Link from "next/link";
import { CleaningRequestStatus, type PropertyType } from "@/src/generated/prisma/client";
import { getEstimateConfirmationPresentation, formatRequestDate, formatTimeWindow } from "@/src/lib/request-confirmation";
import { getAdminDashboardOverview, type AdminDashboardRequestItem } from "@/src/services/admin-dashboard.service";

const propertyLabels: Record<PropertyType, string> = {
  HOUSE: "House", APARTMENT: "Apartment", OFFICE: "Office", COMMERCIAL: "Commercial", AIRBNB: "Airbnb", OTHER: "Other",
};

const statusLabels: Record<CleaningRequestStatus, string> = {
  NEW: "New", REVIEWING: "Reviewing", CONFIRMED: "Confirmed", ASSIGNED: "Assigned", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

function formatMoney(value: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function formatScheduledDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(value));
}

function formatScheduledTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value));
}

function StatusBadge({ status }: { status: CleaningRequestStatus }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabels[status]}</span>;
}

function RequestSummary({ item, compact = false }: { item: AdminDashboardRequestItem; compact?: boolean }) {
  const estimate = getEstimateConfirmationPresentation({ outcome: item.estimateOutcome, amount: item.estimatedPrice, currency: "USD" });
  return (
    <div className={compact ? "min-w-0" : "min-w-0"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">{item.requestNumber}</span>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 truncate font-semibold text-slate-950">{item.customerName}</p>
      <p className="mt-1 text-sm text-slate-600">{item.serviceName} <span className="text-slate-400">·</span> {propertyLabels[item.propertyType]}{item.bedrooms ? ` · ${item.bedrooms} bedroom${item.bedrooms === 1 ? "" : "s"}` : ""}</p>
      {!compact ? <>
        <p className="mt-2 text-sm text-slate-500">Preferred: {formatRequestDate(item.preferredDate)} · {formatTimeWindow(item.preferredTimeWindow)}</p>
        <p className="mt-2 text-sm font-medium text-slate-700">{estimate.label}: {estimate.amount ? formatMoney(item.estimatedPrice as string) : "Needs review"}</p>
      </> : null}
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
    <div className="flex items-center justify-between gap-4">
      <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      {action}
    </div>
    <div className="mt-5">{children}</div>
  </section>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">{children}</p>;
}

export default async function AdminPage() {
  const overview = await getAdminDashboardOverview();
  const cards = [
    { label: "New Requests", value: overview.counts.newRequests, detail: "Awaiting review", href: "/admin/requests" },
    { label: "Today", value: overview.counts.todayScheduled, detail: "Scheduled cleanings", href: "/admin/schedule" },
    { label: "Upcoming", value: overview.counts.upcomingScheduled, detail: "Confirmed work ahead", href: "/admin/schedule" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Dashboard</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Welcome back to your workspace.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">A quick view of new requests, today&apos;s work, and what is coming up.</p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => <Link key={card.label} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:p-6"><p className="text-sm font-semibold text-slate-600">{card.label}</p><p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950" aria-label={`${card.value} ${card.label.toLowerCase()}`}>{card.value}</p><p className="mt-2 text-sm text-slate-500">{card.detail}</p></Link>)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-6">
          <SectionCard title="Needs your attention" action={<Link href="/admin/requests" className="text-sm font-semibold text-blue-700 hover:text-blue-900">View requests</Link>}>
            {overview.needsAttention.length === 0 ? <EmptyState>You&apos;re all caught up. New customer requests will appear here.</EmptyState> : <div className="divide-y divide-slate-100">{overview.needsAttention.map((item) => <div key={item.id} className="py-4 first:pt-0 last:pb-0"><RequestSummary item={item} /></div>)}</div>}
          </SectionCard>

          <SectionCard title="Recent requests" action={<Link href="/admin/requests" className="text-sm font-semibold text-blue-700 hover:text-blue-900">View all</Link>}>
            {overview.recentRequests.length === 0 ? <EmptyState>No cleaning requests yet.</EmptyState> : <div className="divide-y divide-slate-100">{overview.recentRequests.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"><RequestSummary item={item} compact /><time className="shrink-0 text-right text-xs text-slate-500" dateTime={item.createdAt}>{formatScheduledDate(item.createdAt)}<br />{formatScheduledTime(item.createdAt)}</time></div>)}</div>}
          </SectionCard>
        </div>

        <SectionCard title="Today&apos;s cleanings" action={<Link href="/admin/schedule" className="text-sm font-semibold text-blue-700 hover:text-blue-900">View schedule</Link>}>
          {overview.todaysCleanings.length === 0 ? <EmptyState>No cleanings scheduled for today.</EmptyState> : <div className="divide-y divide-slate-100">{overview.todaysCleanings.map((item) => <div key={item.id} className="py-4 first:pt-0 last:pb-0"><p className="text-sm font-semibold text-slate-950">{item.scheduledStart ? formatScheduledTime(item.scheduledStart) : "Time to confirm"}</p><div className="mt-2 flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.customerName}</p><p className="mt-1 text-sm text-slate-600">{item.serviceName} · {propertyLabels[item.propertyType]}</p></div><StatusBadge status={item.status} /></div></div>)}</div>}
        </SectionCard>
      </div>
    </div>
  );
}
