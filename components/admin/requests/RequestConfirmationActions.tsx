"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CleaningRequestStatus } from "@/src/generated/prisma/client";
import type { ConfirmationReadiness } from "@/src/lib/cleaning-request-confirmation";
import { confirmCleaningRequestAction } from "@/app/actions/confirm-cleaning-request";

type Props = { requestId: string; status: CleaningRequestStatus; confirmedPrice: string | null; confirmedSchedule: { start: string | null; end: string | null } | null; readiness: ConfirmationReadiness };

function formatSchedule(schedule: Props["confirmedSchedule"]): string {
  if (!schedule?.start || !schedule.end) return "Complete confirmed schedule";
  return `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(schedule.start))} – ${new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "America/New_York" }).format(new Date(schedule.end))}`;
}

export default function RequestConfirmationActions({ requestId, status, confirmedPrice, confirmedSchedule, readiness }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (status !== "REVIEWING") return null;
  const invalidPrice = readiness.invalid.includes("CONFIRMED_PRICE");
  const invalidSchedule = readiness.invalid.includes("SCHEDULE_RANGE");
  const submit = () => startTransition(async () => {
    setError(null);
    const result = await confirmCleaningRequestAction({ cleaningRequestId: requestId });
    if (result.success) { setOpen(false); router.refresh(); return; }
    if (result.reason === "STATUS_CONFLICT" || result.reason === "INVALID_REQUEST_STATUS" || result.reason === "CONFIRMATION_NOT_READY") { setOpen(false); router.refresh(); }
    setError(result.reason === "CONFIRMATION_NOT_READY" ? "The request is no longer ready to confirm. Review the current price and schedule." : "The request changed before it could be confirmed. Refresh and try again.");
  });
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="confirmation-readiness-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="confirmation-readiness-heading" className="text-lg font-semibold text-slate-950">Confirmation readiness</h2><p className="mt-1 text-sm text-slate-600">A request can be confirmed when its price and appointment are complete.</p></div>{readiness.ready && <button type="button" onClick={() => { setError(null); setOpen(true); }} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Confirm request</button>}</div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><dt className="font-semibold text-slate-700">Confirmed price</dt><dd className="mt-1 text-slate-600">{invalidPrice ? "Invalid confirmed price" : confirmedPrice ? `$${confirmedPrice}` : "Set a confirmed price"}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="font-semibold text-slate-700">Confirmed schedule</dt><dd className="mt-1 text-slate-600">{invalidSchedule ? "Invalid confirmed schedule" : formatSchedule(confirmedSchedule)}</dd></div></dl>{!readiness.ready && <p className="mt-4 text-sm text-amber-800">Set the missing requirements before confirming this request.</p>}{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}{open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="confirm-request-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h3 id="confirm-request-heading" className="text-xl font-semibold text-slate-950">Confirm this request?</h3><p className="mt-2 text-sm text-slate-600">Once confirmed, the request will be ready for worker assignment.</p><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Price</dt><dd className="font-semibold text-slate-900">${confirmedPrice}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Schedule</dt><dd className="text-right font-semibold text-slate-900">{formatSchedule(confirmedSchedule)}</dd></div></dl><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} disabled={pending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="button" onClick={submit} disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Confirming…" : "Confirm request"}</button></div></div></div>}</section>;
}
