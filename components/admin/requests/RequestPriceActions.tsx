"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCleaningRequestConfirmedPriceAction } from "@/app/actions/set-cleaning-request-confirmed-price";
import type { CleaningRequestStatus } from "@/src/generated/prisma/client";

type PriceHistoryItem = { id: string; previousConfirmedPrice: string | null; newConfirmedPrice: string; reason: string | null; changedAt: string; changedBy: { id: string; name: string; email: string } };

function money(value: string | null): string { return value === null ? "Not set yet" : `$${value}`; }

export default function RequestPriceActions({ requestId, status, estimatedPrice, confirmedPrice, priceHistory }: { requestId: string; status: CleaningRequestStatus; estimatedPrice: string | null; confirmedPrice: string | null; priceHistory: PriceHistoryItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(confirmedPrice ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = status === "REVIEWING";
  const busy = pending;

  const openEditor = () => {
    if (!editable || busy) return;
    setPrice(confirmedPrice ?? "");
    setReason("");
    setError(null);
    setOpen(true);
  };

  const closeEditor = () => {
    if (!busy) {
      setOpen(false);
      setError(null);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    startTransition(async () => {
      const result = await setCleaningRequestConfirmedPriceAction({ cleaningRequestId: requestId, confirmedPrice: price, reason });
      if (result.success) {
        setOpen(false);
        router.refresh();
        return;
      }
      if (result.reason === "STATUS_CONFLICT") {
        setError("This request changed while you were editing the price. Refreshing to show the latest value.");
        router.refresh();
      } else if (result.reason === "INVALID_REQUEST_STATUS") {
        setError("The confirmed price can no longer be changed from this request state.");
        router.refresh();
      } else if (result.reason === "NO_PRICE_CHANGE") {
        setError("Enter a different confirmed price.");
      } else if (result.reason === "PRICE_CHANGE_REASON_REQUIRED") {
        setError("Please explain why the confirmed price is changing.");
      } else if (result.reason === "REQUEST_NOT_FOUND") {
        router.push("/admin/requests");
      } else {
        setError("We couldn't update the confirmed price right now. Please try again.");
      }
    });
  };

  return <>
    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <dl className="min-w-0 flex-1"><div className="flex items-start justify-between gap-5 border-b border-slate-100 py-3 first:pt-0 last:border-0"><dt className="text-sm text-slate-500">Starting estimate</dt><dd className="text-right text-sm font-medium text-slate-800">{money(estimatedPrice)}</dd></div><div className="flex items-start justify-between gap-5 py-3"><dt className="text-sm text-slate-500">Confirmed price</dt><dd className="text-right text-sm font-semibold text-slate-900">{money(confirmedPrice)}</dd></div></dl>
      {editable ? <button type="button" onClick={openEditor} disabled={busy} className="min-h-11 rounded-xl bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">{confirmedPrice === null ? "Set confirmed price" : "Change confirmed price"}</button> : null}
    </div>
    {open ? <div role="dialog" aria-modal="true" aria-labelledby="confirmed-price-heading" className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div><h3 id="confirmed-price-heading" className="font-semibold text-slate-950">{confirmedPrice === null ? "Set confirmed price" : "Change confirmed price"}</h3><p className="mt-1 text-sm text-slate-600">This updates the current business price only. The request remains in review.</p></div><button type="button" onClick={closeEditor} disabled={busy} aria-label="Close confirmed price dialog" className="text-2xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-50">×</button></div><form onSubmit={submit} className="mt-4 space-y-4"><label htmlFor="confirmed-price" className="block text-sm font-semibold text-slate-700">Confirmed price<input id="confirmed-price" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="250.00" autoFocus className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" /></label><label htmlFor="price-change-reason" className="block text-sm font-semibold text-slate-700">Reason{confirmedPrice !== null ? <span className="font-normal text-slate-500"> (required for a change)</span> : <span className="font-normal text-slate-500"> (optional)</span>}<textarea id="price-change-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder={confirmedPrice === null ? "Optional context for setting this price..." : "Explain why the confirmed price is changing..."} className="mt-2 block min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" /></label>{error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeEditor} disabled={busy} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">{busy ? "Saving…" : "Save confirmed price"}</button></div></form></div> : null}
    <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="text-sm font-semibold text-slate-800">Price history</h3>{priceHistory.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-600">No confirmed price changes yet.</p> : <ol className="mt-4 space-y-4">{priceHistory.map((item) => <li key={item.id} className="rounded-xl bg-slate-50 px-4 py-4"><p className="font-semibold text-slate-900">{item.previousConfirmedPrice === null ? "Confirmed price set" : "Confirmed price changed"}</p><p className="mt-1 text-sm text-slate-700">{money(item.previousConfirmedPrice)} → {money(item.newConfirmedPrice)}</p><p className="mt-2 text-xs text-slate-500"><time dateTime={item.changedAt}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(item.changedAt))}</time> · {item.changedBy.name}<span className="block text-slate-400">{item.changedBy.email}</span></p>{item.reason ? <div className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-700"><p className="font-semibold text-slate-600">Reason</p><p className="mt-1 whitespace-pre-wrap break-words">{item.reason}</p></div> : null}</li>)}</ol>}</div>
  </>;
}
