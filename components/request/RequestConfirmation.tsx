"use client";

import { CheckCircle2, Clipboard, ClipboardCheck, Sparkles } from "lucide-react";
import BusinessLogo from "@/components/branding/BusinessLogo";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  formatRequestDate,
  formatTimeWindow,
  getEstimateConfirmationPresentation,
  type RequestConfirmationData,
} from "@/src/lib/request-confirmation";

type RequestConfirmationProps = {
  data: RequestConfirmationData;
  onRequestAnother: () => void;
};

export default function RequestConfirmation({ data, onRequestAnother }: RequestConfirmationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const estimate = getEstimateConfirmationPresentation(data.estimate);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const copyRequestNumber = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(data.requestNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Copy is optional; the request number remains selectable.
    }
  };

  return (
    <section className="px-5 py-8 sm:px-10 sm:py-12" aria-live="polite">
      <div className="mx-auto max-w-2xl text-center">
        <BusinessLogo size={56} className="mx-auto" />
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Request received</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 outline-none sm:text-4xl">Thanks, {data.customerName}.</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">We have your cleaning request. Our team will review the details and follow up to confirm availability and final pricing.</p>

        <div className="mt-8 rounded-2xl bg-slate-950 p-5 text-left text-white shadow-xl shadow-slate-950/10 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Request number</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="select-all font-mono text-xl font-semibold tracking-wide sm:text-2xl">{data.requestNumber}</p>
            <button type="button" onClick={() => void copyRequestNumber()} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-white/20 px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" aria-label={`Copy request number ${data.requestNumber}`}>
              {copied ? <ClipboardCheck className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Cleaning service</p>
            <p className="mt-2 font-semibold text-slate-950">{data.serviceName}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{data.propertySummary}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Preferred time</p>
            <p className="mt-2 font-semibold text-slate-950">{formatRequestDate(data.preferredDate)}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{formatTimeWindow(data.preferredTimeWindow)} · We’ll confirm availability</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left">
          <div className="flex items-center gap-2 text-blue-800"><Sparkles className="size-4" aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.14em]">{estimate.label}</p></div>
          {estimate.amount ? <p className="mt-3 text-3xl font-semibold tracking-tight text-blue-950">{estimate.amount}</p> : null}
          <p className="mt-2 text-sm leading-6 text-blue-950/75">{estimate.description}</p>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-8 text-left">
          <h2 className="text-lg font-semibold text-slate-950">What happens next?</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span><span>We review your request details.</span></li>
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span><span>We confirm the final price and availability.</span></li>
            <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span><span>We contact you using the phone number or email provided to confirm the visit.</span></li>
          </ol>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Back to home</Link>
          <button type="button" onClick={onRequestAnother} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><Sparkles className="size-4" aria-hidden="true" />Request another cleaning</button>
        </div>
      </div>
    </section>
  );
}
