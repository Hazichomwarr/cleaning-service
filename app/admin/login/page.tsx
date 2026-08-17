import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db/prisma";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import BusinessLogo from "@/components/branding/BusinessLogo";

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    const activeAdmin = await prisma.adminUser.findUnique({
      where: { id: session.user.id },
      select: { isActive: true },
    });
    if (activeAdmin?.isActive) redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-5 py-12 text-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight text-slate-950"><BusinessLogo size={40} alt="" />Just Cleaning</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Manage cleaning requests and daily operations.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
