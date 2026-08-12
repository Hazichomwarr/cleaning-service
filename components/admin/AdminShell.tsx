"use client";

import { Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_NAV_ITEMS, isAdminNavigationItemActive } from "@/src/lib/admin-navigation";

type AdminShellProps = {
  admin: { name: string; email: string };
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin" className="inline-flex items-center gap-3 text-slate-950">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><Sparkles className="size-4" aria-hidden="true" /></span>
      <span className={compact ? "text-base font-semibold tracking-tight" : "text-lg font-semibold tracking-tight"}>Just Cleaning <span className="font-normal text-slate-500">Admin</span></span>
    </Link>
  );
}

function AdminNavigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin navigation" className="space-y-1">
      {ADMIN_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = isAdminNavigationItemActive(pathname, href);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? "bg-blue-50 text-blue-800 ring-1 ring-blue-100" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
            <Icon className={`size-4 ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AdminAccount({ admin, logoutAction }: Pick<AdminShellProps, "admin" | "logoutAction">) {
  const name = admin.name.trim() || "Administrator";
  return (
    <div className="border-t border-slate-200 pt-5">
      <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
      <p className="mt-1 truncate text-xs text-slate-500" title={admin.email}>{admin.email}</p>
      <form action={logoutAction} className="mt-4">
        <button type="submit" className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Sign out</button>
      </form>
    </div>
  );
}

export default function AdminShell({ admin, logoutAction, children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        <AdminBrand />
        <div className="mt-10 flex-1"><AdminNavigation pathname={pathname} /></div>
        <AdminAccount admin={admin} logoutAction={logoutAction} />
      </aside>
      <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:hidden">
        <AdminBrand compact />
        <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close admin navigation" : "Open admin navigation"} aria-expanded={mobileOpen} aria-controls="admin-mobile-navigation" className="flex size-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </header>
      {mobileOpen ? (
        <>
          <button type="button" aria-label="Close admin navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-20 bg-slate-950/25 lg:hidden" />
          <aside id="admin-mobile-navigation" role="dialog" aria-modal="true" aria-label="Admin navigation" className="fixed inset-y-16 right-0 z-30 w-[min(20rem,88vw)] border-l border-slate-200 bg-white px-5 py-6 shadow-2xl lg:hidden">
            <AdminNavigation pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Signed in as</p><div className="mt-3"><AdminAccount admin={admin} logoutAction={logoutAction} /></div></div>
          </aside>
        </>
      ) : null}
      <div className="lg:pl-64"><main className="min-w-0 px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">{children}</main></div>
    </div>
  );
}
