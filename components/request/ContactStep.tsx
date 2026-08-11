import type { CleaningRequestDraft } from "@/src/types/cleaning-request-draft";

type ContactStepProps = {
  draft: CleaningRequestDraft;
  onChange: (field: keyof CleaningRequestDraft, value: string) => void;
};

export default function ContactStep({ draft, onChange }: ContactStepProps) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold text-slate-950">Your information</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
            Full name
            <input value={draft.customerName} onChange={(event) => onChange("customerName", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Phone
            <input type="tel" value={draft.customerPhone} onChange={(event) => onChange("customerPhone", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Email
            <input type="email" value={draft.customerEmail} onChange={(event) => onChange("customerEmail", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-950">Cleaning address</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
            Street address
            <input value={draft.addressLine1} onChange={(event) => onChange("addressLine1", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
            Apt, unit, or suite <span className="font-normal text-slate-400">(optional)</span>
            <input value={draft.addressLine2} onChange={(event) => onChange("addressLine2", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            City
            <input value={draft.city} onChange={(event) => onChange("city", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            State
            <input value={draft.state} onChange={(event) => onChange("state", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            ZIP code
            <input inputMode="numeric" value={draft.postalCode} onChange={(event) => onChange("postalCode", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
      </section>

      <label className="block text-sm font-semibold text-slate-800">
        Anything we should know? <span className="font-normal text-slate-400">(optional)</span>
        <textarea value={draft.customerNotes} onChange={(event) => onChange("customerNotes", event.target.value)} rows={4} placeholder="Pets, gate instructions, parking notes, or areas needing special attention" className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      </label>
    </div>
  );
}
