import Link from "next/link";
import { notFound } from "next/navigation";
import { CleaningEstimateOutcome, CleaningRequestStatus, type PropertyType } from "@/src/generated/prisma/client";
import { formatTimeWindow } from "@/src/lib/request-confirmation";
import RequestLifecycleActions from "@/components/admin/requests/RequestLifecycleActions";
import RequestConfirmationActions from "@/components/admin/requests/RequestConfirmationActions";
import RequestPriceActions from "@/components/admin/requests/RequestPriceActions";
import RequestScheduleActions from "@/components/admin/requests/RequestScheduleActions";
import RequestAssignmentActions from "@/components/admin/requests/RequestAssignmentActions";
import RequestWorkActions from "@/components/admin/requests/RequestWorkActions";
import { getAdminCleaningRequestDetail, type AdminCleaningRequestDetail } from "@/src/services/admin-cleaning-request-detail.service";
import { getEligibleWorkersForCleaningRequest } from "@/src/services/cleaning-request-assignment.service";

const statusLabels: Record<CleaningRequestStatus, string> = {
  NEW: "New", REVIEWING: "Reviewing", CONFIRMED: "Confirmed", ASSIGNED: "Assigned", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
const propertyLabels: Record<PropertyType, string> = {
  HOUSE: "House", APARTMENT: "Apartment", OFFICE: "Office", COMMERCIAL: "Commercial space", AIRBNB: "Airbnb / Short-term rental", OTHER: "Other",
};

function formatPhone(value: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(value);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : value;
}

function formatPreferredDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatBusinessDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value));
}

function formatMoney(value: string | null): string | null {
  return value === null ? null : `$${value}`;
}

function SectionCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`} aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}><h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2><div className="mt-5">{children}</div></section>;
}

function StatusBadge({ status }: { status: CleaningRequestStatus }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{statusLabels[status]}</span>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-5 border-b border-slate-100 py-3 last:border-0 last:pb-0 first:pt-0"><dt className="shrink-0 text-sm text-slate-500">{label}</dt><dd className="min-w-0 text-right text-sm font-medium text-slate-800">{value}</dd></div>;
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">{children}</p>;
}

function EstimateSection({ detail }: { detail: AdminCleaningRequestDetail }) {
  const amount = formatMoney(detail.estimate.estimatedPrice);
  let estimateText = "Needs review";
  if (detail.estimate.outcome === CleaningEstimateOutcome.AUTOMATIC_ESTIMATE) estimateText = amount ?? "Needs review";
  if (detail.estimate.outcome === CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED) estimateText = "Custom estimate required";
  if (detail.estimate.outcome === CleaningEstimateOutcome.ESTIMATE_UNAVAILABLE) estimateText = "Unavailable — needs review";
  return <SectionCard title="Price"><p className="text-sm text-slate-500">Starting estimate outcome: <span className="font-medium text-slate-700">{estimateText}</span></p><RequestPriceActions requestId={detail.id} status={detail.status} estimatedPrice={amount} confirmedPrice={detail.estimate.confirmedPrice} priceHistory={detail.priceHistory} /></SectionCard>;
}

function ScheduleSection({ detail }: { detail: AdminCleaningRequestDetail }) {
  const confirmed = detail.confirmedSchedule;
  return <SectionCard title="Schedule"><dl><DetailRow label="Preferred date" value={formatPreferredDate(detail.preferredSchedule.date)} /><DetailRow label="Preferred window" value={formatTimeWindow(detail.preferredSchedule.timeWindow)} /></dl><RequestScheduleActions requestId={detail.id} status={detail.status} preferredLabel={`${formatPreferredDate(detail.preferredSchedule.date)} · ${formatTimeWindow(detail.preferredSchedule.timeWindow)}`} confirmedSchedule={confirmed} scheduleHistory={detail.scheduleHistory} /></SectionCard>;
}

function CustomerSection({ detail }: { detail: AdminCleaningRequestDetail }) {
  return <SectionCard title="Customer"><div><p className="text-xl font-semibold text-slate-950">{detail.customer.name}</p><div className="mt-4 space-y-2 text-sm"><a href={`tel:${detail.customer.phone}`} className="block break-all font-medium text-blue-700 hover:text-blue-900">{formatPhone(detail.customer.phone)} <span className="text-xs text-slate-400">Call</span></a><a href={`mailto:${detail.customer.email}`} className="block break-all font-medium text-blue-700 hover:text-blue-900">{detail.customer.email} <span className="text-xs text-slate-400">Email</span></a></div></div></SectionCard>;
}

function PropertySection({ detail }: { detail: AdminCleaningRequestDetail }) {
  const isResidential = detail.property.type === "HOUSE" || detail.property.type === "APARTMENT" || detail.property.type === "AIRBNB";
  return <SectionCard title="Property"><dl><DetailRow label="Type" value={propertyLabels[detail.property.type]} />{isResidential && detail.property.bedrooms !== null ? <DetailRow label="Bedrooms" value={`${detail.property.bedrooms} bedroom${detail.property.bedrooms === 1 ? "" : "s"}`} /> : null}{isResidential && detail.property.bathrooms !== null ? <DetailRow label="Bathrooms" value={`${detail.property.bathrooms} bathroom${detail.property.bathrooms === "1" ? "" : "s"}`} /> : null}{detail.property.approximateSquareFeet !== null ? <DetailRow label="Size" value={`Approx. ${detail.property.approximateSquareFeet.toLocaleString()} sq ft`} /> : null}</dl></SectionCard>;
}

function AddressSection({ detail }: { detail: AdminCleaningRequestDetail }) {
  return <SectionCard title="Service address"><address className="not-italic text-sm leading-7 text-slate-700"><span className="block break-words">{detail.address.line1}</span>{detail.address.line2 ? <span className="block break-words">{detail.address.line2}</span> : null}<span className="block break-words">{detail.address.city}, {detail.address.state} {detail.address.postalCode}</span></address></SectionCard>;
}

function NotesSection({ title, value, empty }: { title: string; value: string | null; empty: string }) {
  return <SectionCard title={title}>{value ? <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{value}</p> : <EmptyText>{empty}</EmptyText>}</SectionCard>;
}

function ExtrasSection({ detail }: { detail: AdminCleaningRequestDetail }) {
  return <SectionCard title="Selected extras">{detail.extras.length > 0 ? <ul className="space-y-3">{detail.extras.map((extra) => <li key={extra.id} className="flex items-start gap-3 text-sm text-slate-700"><span className="mt-1 text-blue-600" aria-hidden="true">•</span><span>{extra.name}</span></li>)}</ul> : <EmptyText>No extras selected.</EmptyText>}</SectionCard>;
}

function AssignmentsSection({ detail, eligibleWorkers }: { detail: AdminCleaningRequestDetail; eligibleWorkers: Awaited<ReturnType<typeof getEligibleWorkersForCleaningRequest>> }) {
  return <RequestAssignmentActions requestId={detail.id} status={detail.status} assignments={detail.assignments} eligibleWorkers={eligibleWorkers} assignmentHistory={detail.assignmentHistory} />;
}

function CancellationSection({ detail }: { detail: AdminCleaningRequestDetail }) {
  if (!detail.cancellation) return null;
  return <SectionCard title="Cancellation" className="border-amber-200"><dl><DetailRow label="Status" value="Cancelled" /><DetailRow label="Date" value={detail.cancellation.cancelledAt ? formatBusinessDateTime(detail.cancellation.cancelledAt) : "No cancellation date recorded"} /><DetailRow label="Reason" value={detail.cancellation.reason ?? "No cancellation reason recorded."} /></dl></SectionCard>;
}

function StatusHistorySection({ detail }: { detail: AdminCleaningRequestDetail }) {
  return <SectionCard title="Status history"><p className="mb-5 text-sm text-slate-500">A read-only record of lifecycle changes made by admins.</p>{detail.statusHistory.length === 0 ? <EmptyText>No status changes yet.</EmptyText> : <ol className="relative ml-2 border-l border-slate-200">{detail.statusHistory.map((item) => <li key={item.id} className="relative pb-6 pl-6 last:pb-0"><span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-sm" aria-hidden="true" /><p className="font-semibold text-slate-900">{statusLabels[item.fromStatus]} → {statusLabels[item.toStatus]}</p><p className="mt-1 text-sm text-slate-600">{item.toStatus === CleaningRequestStatus.CANCELLED ? "Request declined" : item.toStatus === CleaningRequestStatus.REVIEWING ? "Accepted for review" : "Status updated"}</p><p className="mt-2 text-xs text-slate-500"><time dateTime={item.changedAt}>{formatBusinessDateTime(item.changedAt)}</time> · {item.changedBy.name}<span className="block text-slate-400">{item.changedBy.email}</span></p>{item.reason ? <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><p className="font-semibold text-slate-600">Reason</p><p className="mt-1 whitespace-pre-wrap break-words">{item.reason}</p></div> : null}</li>)}</ol>}</SectionCard>;
}

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminCleaningRequestDetail(id);
  if (!detail) notFound();
  const eligibleWorkers = await getEligibleWorkersForCleaningRequest(detail.id);
  return <div className="mx-auto max-w-7xl"><Link href="/admin/requests" className="inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">← Back to requests</Link><header className="mt-6 flex flex-col gap-4 border-b border-slate-200 pb-7 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">{detail.requestNumber}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{detail.service.name}</h1><p className="mt-2 text-base text-slate-600">{detail.customer.name}</p></div><StatusBadge status={detail.status} /></header><RequestLifecycleActions requestId={detail.id} status={detail.status} /><RequestConfirmationActions requestId={detail.id} status={detail.status} confirmedPrice={detail.estimate.confirmedPrice} confirmedSchedule={detail.confirmedSchedule} readiness={detail.confirmationReadiness} /><RequestWorkActions requestId={detail.id} requestNumber={detail.requestNumber} status={detail.status} assignments={detail.assignments.map((assignment) => ({ workerName: assignment.workerName, workerType: assignment.workerType }))} confirmedSchedule={detail.confirmedSchedule} readiness={detail.workflowReadiness} /><div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]"><div className="space-y-6"><CustomerSection detail={detail} /><div className="grid gap-6 sm:grid-cols-2"><PropertySection detail={detail} /><AddressSection detail={detail} /></div><ExtrasSection detail={detail} /><NotesSection title="Customer notes" value={detail.customerNotes} empty="No customer notes." /><NotesSection title="Internal notes" value={detail.internalNotes} empty="No internal notes yet." /></div><div className="space-y-6"><EstimateSection detail={detail} /><ScheduleSection detail={detail} /><AssignmentsSection detail={detail} eligibleWorkers={eligibleWorkers} /><CancellationSection detail={detail} /><StatusHistorySection detail={detail} /><SectionCard title="Request metadata"><dl><DetailRow label="Request created" value={formatBusinessDateTime(detail.createdAt)} /><DetailRow label="Last updated" value={formatBusinessDateTime(detail.updatedAt)} /></dl></SectionCard></div></div></div>;
}
