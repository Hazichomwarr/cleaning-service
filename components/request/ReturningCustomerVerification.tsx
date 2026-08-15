"use client";

import { useState } from "react";
import { startReturningCustomerVerificationAction } from "@/app/actions/start-returning-customer-verification";
import { verifyReturningCustomerCodeAction } from "@/app/actions/verify-returning-customer-code";

type Mode = "start" | "code" | "verified";

export default function ReturningCustomerVerification() {
  const [mode, setMode] = useState<Mode>("start");
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    if (!identity.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    const value = identity.trim();
    const result = await startReturningCustomerVerificationAction(value.includes("@") ? { email: value } : { phone: value });
    setBusy(false);
    if (!result.success) {
      setMessage(result.reason === "INVALID_INPUT" ? "Enter a valid email address or phone number." : "We couldn’t start verification right now. Please continue as a new customer.");
      return;
    }
    setMode("code");
  };

  const verify = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setMessage(null);
    const result = await verifyReturningCustomerCodeAction({ code });
    setBusy(false);
    if (!result.success) {
      setMessage(result.reason === "INVALID_INPUT" ? "Enter the 6-digit code." : "That code is invalid or has expired. Please request a new code and try again.");
      return;
    }
    setMode("verified");
  };

  return (
    <section className="mb-8 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 sm:p-7" aria-labelledby="returning-customer-title">
      {mode === "verified" ? (
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">You’re verified</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Welcome back.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">You can continue with your cleaning request below. Saved properties will be available in a future step.</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">Already booked with us before?</p>
          <h2 id="returning-customer-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Welcome back</h2>
          {mode === "start" ? (
            <>
              <p className="mt-2 text-sm leading-6 text-slate-600">Enter the email or phone number you’ve used with us before.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="returning-customer-identity">Email or phone</label>
                <input id="returning-customer-identity" value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="Email or phone" autoComplete="email tel" className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-500 transition focus:ring-2" />
                <button type="button" onClick={() => void start()} disabled={busy || !identity.trim()} className="min-h-12 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? "Sending…" : "Send verification code"}</button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-slate-600">If we found a matching customer record, we’ve sent a verification code to the email on file.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="returning-customer-code">Verification code</label>
                <input id="returning-customer-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm tracking-[0.3em] outline-none ring-blue-500 transition focus:ring-2" />
                <button type="button" onClick={() => void verify()} disabled={busy || code.length !== 6} className="min-h-12 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? "Verifying…" : "Verify"}</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">Use the latest code we sent. You can still continue below as a new customer.</p>
            </>
          )}
          {message ? <p className="mt-4 text-sm font-semibold text-rose-700" role="alert">{message}</p> : null}
        </>
      )}
    </section>
  );
}
