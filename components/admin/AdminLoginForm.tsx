"use client";

import { useActionState } from "react";
import { loginAdmin, type AdminLoginState } from "@/app/admin/login/actions";

const initialState: AdminLoginState = {};

export default function AdminLoginForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [state, formAction, pending] = useActionState(loginAdmin, { ...initialState, email: initialEmail });

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-950" role="alert">{state.error}</div> : null}
      <label className="block text-sm font-semibold text-slate-800">
        Email
        <input name="email" type="email" autoComplete="email" defaultValue={state.email ?? initialEmail} required className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      </label>
      <label className="block text-sm font-semibold text-slate-800">
        Password
        <input name="password" type="password" autoComplete="current-password" required className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      </label>
      <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
