import Link from "next/link";
import CustomerForm from "@/components/admin/customers/CustomerForm";

export default function NewCustomerPage() { return <main className="mx-auto max-w-3xl"><Link href="/admin/customers" className="text-sm font-semibold text-blue-700">← Customers</Link><header className="mt-6"><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Customers</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Add customer</h1><p className="mt-3 text-base leading-7 text-slate-600">Save contact details and, if useful, one property for future bookings.</p></header><div className="mt-8"><CustomerForm /></div></main>; }
