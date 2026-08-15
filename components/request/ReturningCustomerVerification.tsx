"use client";

import { useState } from "react";
import { startReturningCustomerVerificationAction } from "@/app/actions/start-returning-customer-verification";
import { verifyReturningCustomerCodeAction } from "@/app/actions/verify-returning-customer-code";
import { getReturningCustomerPropertiesAction } from "@/app/actions/get-returning-customer-properties";
import type { VerifiedCustomerPropertyOption } from "@/src/services/verified-customer-properties.service";

type Mode = "start" | "code" | "verified";

export default function ReturningCustomerVerification({ onPropertySelect }: { onPropertySelect?: (propertyId: string | null) => void }) {
  const [mode, setMode] = useState<Mode>("start");
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [properties, setProperties] = useState<VerifiedCustomerPropertyOption[] | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

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
    setPropertiesLoading(true);
    const propertyResult = await getReturningCustomerPropertiesAction();
    setPropertiesLoading(false);
    setProperties(propertyResult.success ? propertyResult.properties : []);
  };

  const selectProperty = (propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
    onPropertySelect?.(propertyId);
  };

  return (
    <section className="mb-8 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 sm:p-7" aria-labelledby="returning-customer-title">
      {mode === "verified" ? (
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">You’re verified</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Welcome back.</h2>
          {propertiesLoading ? <p className="mt-2 text-sm leading-6 text-slate-600">Loading your saved properties…</p> : properties?.length ? <div className="mt-6"><h3 className="text-lg font-semibold text-slate-950">Choose a saved property</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{properties.map((property) => <article key={property.id} className={`rounded-2xl border bg-white p-4 ${selectedPropertyId === property.id ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}><h4 className="font-semibold text-slate-950">{property.label || `${property.address.line1}`}</h4><p className="mt-1 text-sm text-slate-600">{property.address.line1}{property.address.line2 ? `, ${property.address.line2}` : ""}<br />{property.address.city}, {property.address.state} {property.address.postalCode}</p><p className="mt-2 text-xs text-slate-500">{propertyTypeLabel(property.propertyType)}{property.bedrooms === null ? "" : ` · ${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"}`}{property.bathrooms === null ? "" : ` · ${property.bathrooms} bathroom${property.bathrooms === "1" ? "" : "s"}`}{property.approximateSquareFeet === null ? "" : ` · ${property.approximateSquareFeet.toLocaleString()} sq ft`}</p><button type="button" onClick={() => selectProperty(property.id)} className="mt-4 min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">{selectedPropertyId === property.id ? "Selected" : "Use this property"}</button></article>)}</div><button type="button" onClick={() => selectProperty(null)} className="mt-4 text-sm font-semibold text-blue-700 underline underline-offset-4">Use a different property</button></div> : <div className="mt-4"><p className="text-sm leading-6 text-slate-600">We don’t have a saved property for you yet. You can continue with a new property below.</p></div>}
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

function propertyTypeLabel(value: VerifiedCustomerPropertyOption["propertyType"]): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
