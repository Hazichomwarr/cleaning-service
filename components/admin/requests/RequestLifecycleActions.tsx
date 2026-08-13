"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CleaningRequestStatus } from "@/src/generated/prisma/client";
import { transitionCleaningRequestStatusAction } from "@/app/actions/transition-cleaning-request-status";
import { canShowNewRequestActions } from "@/src/lib/admin-request-actions";

type ActionState = "idle" | "accepting" | "declining";

function messageForFailure(reason: string): string {
  if (reason === "CANCELLATION_REASON_REQUIRED") return "Enter a reason before declining this request.";
  if (reason === "INVALID_INPUT") return "Check the decline reason and try again.";
  if (reason === "INTERNAL_ERROR") return "We couldn't update this request right now. Please try again.";
  return "This action is no longer available for the current request status.";
}

export default function RequestLifecycleActions({ requestId, status }: { requestId: string; status: CleaningRequestStatus }) {
  const router = useRouter();
  const [action, setAction] = useState<ActionState>("idle");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canShowNewRequestActions(status)) return null;

  const busy = pending || action !== "idle";

  const accept = () => {
    if (busy) return;
    setError(null);
    setAction("accepting");
    startTransition(async () => {
      const result = await transitionCleaningRequestStatusAction({ cleaningRequestId: requestId, toStatus: "REVIEWING" });
      if (result.success) {
        router.refresh();
        return;
      }
      setAction("idle");
      if (result.reason === "STATUS_CONFLICT" || result.reason === "INVALID_TRANSITION") {
        setError(result.reason === "STATUS_CONFLICT" ? "This request changed while you were viewing it. Refreshing the request to show the latest status." : "This action is no longer available for the current request status.");
        router.refresh();
      } else if (result.reason === "REQUEST_NOT_FOUND") {
        router.push("/admin/requests");
      } else {
        setError(messageForFailure(result.reason));
      }
    });
  };

  const openDecline = () => {
    if (busy) return;
    setError(null);
    setDeclineOpen(true);
  };

  const closeDecline = () => {
    if (!busy) {
      setDeclineOpen(false);
      setError(null);
    }
  };

  const decline = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Enter a reason before declining this request.");
      return;
    }
    setError(null);
    setAction("declining");
    startTransition(async () => {
      const result = await transitionCleaningRequestStatusAction({ cleaningRequestId: requestId, toStatus: "CANCELLED", reason: trimmedReason });
      if (result.success) {
        setDeclineOpen(false);
        router.refresh();
        return;
      }
      setAction("idle");
      if (result.reason === "STATUS_CONFLICT" || result.reason === "INVALID_TRANSITION") {
        setError(result.reason === "STATUS_CONFLICT" ? "This request changed while you were viewing it. Refreshing the request to show the latest status." : "This action is no longer available for the current request status.");
        router.refresh();
      } else if (result.reason === "REQUEST_NOT_FOUND") {
        router.push("/admin/requests");
      } else {
        setError(messageForFailure(result.reason));
      }
    });
  };

  return <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5" aria-labelledby="request-actions-heading">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 id="request-actions-heading" className="font-semibold text-slate-950">This request is waiting for review.</h2><p className="mt-1 text-sm text-slate-600">Accept moves it into review. Decline cancels it and saves your reason.</p></div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={accept} disabled={busy} className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">{action === "accepting" ? "Accepting…" : "Accept request"}</button>
        <button type="button" onClick={openDecline} disabled={busy} className="min-h-11 rounded-xl border border-rose-300 bg-white px-5 font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">Decline</button>
      </div>
    </div>
    {error && !declineOpen ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-800">{error}</p> : null}
    {declineOpen ? <div role="dialog" aria-modal="true" aria-labelledby="decline-request-heading" className="mt-5 rounded-xl border border-rose-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4"><div><h3 id="decline-request-heading" className="font-semibold text-slate-950">Decline request</h3><p className="mt-1 text-sm text-slate-600">The request will be cancelled and the reason will be saved.</p></div><button type="button" onClick={closeDecline} disabled={busy} aria-label="Close decline dialog" className="text-2xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-50">×</button></div>
      <form onSubmit={decline} className="mt-4 space-y-4"><label htmlFor="decline-reason" className="block text-sm font-semibold text-slate-700">Reason for declining<textarea id="decline-reason" value={reason} onChange={(event) => setReason(event.target.value)} autoFocus maxLength={500} rows={4} placeholder="Outside service area, unavailable date, service not offered..." className="mt-2 block min-h-28 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" /></label>{error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeDecline} disabled={busy} className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold text-slate-700 disabled:opacity-50">Keep request</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-rose-700 px-5 font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400">{action === "declining" ? "Declining…" : "Decline request"}</button></div></form>
    </div> : null}
  </section>;
}
