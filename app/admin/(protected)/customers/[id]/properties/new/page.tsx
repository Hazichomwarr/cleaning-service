import Link from "next/link";
import { notFound } from "next/navigation";
import CustomerPropertyForm from "@/components/admin/customers/CustomerPropertyForm";
import { getAdminCustomerDetail } from "@/src/services/admin-customer-detail.service";

export default async function NewCustomerPropertyPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const customer = await getAdminCustomerDetail(id); if (!customer) notFound(); return <main className="mx-auto max-w-3xl"><Link href={`/admin/customers/${id}`} className="text-sm font-semibold text-blue-700">← {customer.name}</Link><header className="mt-6"><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Saved property</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Add property</h1><p className="mt-3 text-base leading-7 text-slate-600">Save another reusable location for {customer.name}.</p></header><div className="mt-8"><CustomerPropertyForm customerId={id} /></div></main>; }
