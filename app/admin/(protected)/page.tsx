import { logoutAdmin } from "@/app/admin/actions";
import { requireAdmin } from "@/src/lib/auth/require-admin";

export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Just Cleaning Admin</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">You&apos;re signed in.</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">Welcome, {admin.name}. The admin dashboard is coming next.</p>
          </div>
          <form action={logoutAdmin}>
            <button type="submit" className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Sign out</button>
          </form>
        </div>
      </div>
    </main>
  );
}
