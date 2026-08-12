export default async function AdminRequestDetailPlaceholder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <section className="mx-auto max-w-4xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Request detail</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Request review is coming next.</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">The request detail workspace will be added in the next ticket.</p><p className="mt-5 text-sm text-slate-500">Request reference: <span className="font-mono text-slate-700">{id}</span></p></section>;
}
