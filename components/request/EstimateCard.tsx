import { AlertCircle, CheckCircle2, LoaderCircle, MessageCircle } from "lucide-react";

export type EstimateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; amount: string }
  | { status: "manual" }
  | { status: "unconfigured" }
  | { status: "unavailable" };

export default function EstimateCard({ state }: { state: EstimateState }) {
  if (state.status === "idle") {
    return (
      <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Starting estimate
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose a property type and bedroom count to see the current starting estimate.
        </p>
      </aside>
    );
  }

  if (state.status === "loading") {
    return (
      <aside className="rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center gap-3 text-blue-800">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          <p className="font-semibold">Checking your starting estimate...</p>
        </div>
      </aside>
    );
  }

  if (state.status === "success") {
    return (
      <aside className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10 sm:p-6" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Starting estimate
        </div>
        <p className="mt-3 text-4xl font-semibold tracking-tight">${state.amount}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          This is a starting estimate. Final pricing is confirmed after we review your request.
        </p>
      </aside>
    );
  }

  if (state.status === "manual") {
    return (
      <aside className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <MessageCircle className="size-4" aria-hidden="true" />
          Custom estimate
        </div>
        <p className="mt-3 font-semibold text-slate-900">We will prepare a custom estimate.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Special and commercial properties are reviewed individually for accurate pricing.
        </p>
      </aside>
    );
  }

  if (state.status === "unconfigured") {
    return (
      <aside className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <MessageCircle className="size-4" aria-hidden="true" />
          Estimate to be confirmed
        </div>
        <p className="mt-3 font-semibold text-slate-900">We will confirm your estimate.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This property needs a quick review from our team. You can continue your request.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-3xl border border-rose-200 bg-rose-50 p-5 sm:p-6" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-semibold text-rose-900">
        <AlertCircle className="size-4" aria-hidden="true" />
        Estimate unavailable
      </div>
      <p className="mt-3 font-semibold text-slate-900">We could not calculate the estimate right now.</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        You can continue your request and our team will confirm it with you.
      </p>
    </aside>
  );
}
