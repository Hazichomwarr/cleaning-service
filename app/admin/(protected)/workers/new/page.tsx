import Link from "next/link";
import WorkerForm from "@/components/admin/workers/WorkerForm";

export default function NewWorkerPage() { return <main className="mx-auto max-w-3xl"><Link href="/admin/workers" className="text-sm font-semibold text-blue-700">← Workers</Link><header className="mt-6"><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Workers</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Add worker</h1><p className="mt-3 text-base leading-7 text-slate-600">Add a crew member or contractor to the operational roster.</p></header><div className="mt-8"><WorkerForm /></div></main>; }
