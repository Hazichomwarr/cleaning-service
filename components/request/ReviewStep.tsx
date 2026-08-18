import type { CatalogItem, CleaningRequestDraft } from "@/src/types/cleaning-request-draft";
import type { RequestFlowMode, RequestFlowSection } from "@/src/lib/request-flow";
import type { VerifiedCustomerPropertyOption } from "@/src/services/verified-customer-properties.service";
import type { EstimateState } from "./EstimateCard";

type ReviewStepProps = {
  draft: CleaningRequestDraft;
  services: CatalogItem[];
  estimate: EstimateState;
  mode: RequestFlowMode;
  selectedSavedProperty: VerifiedCustomerPropertyOption | null;
  onEdit: (section: RequestFlowSection) => void;
  onNotesChange: (notes: string) => void;
};

function SummaryRow({ label, value, section, onEdit }: { label: string; value: string; section: RequestFlowSection; onEdit: (section: RequestFlowSection) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{value || "Not provided"}</p>
      </div>
      <button type="button" onClick={() => onEdit(section)} className="text-sm font-semibold text-blue-700 hover:text-blue-900">Edit</button>
    </div>
  );
}

export default function ReviewStep({ draft, services, estimate, mode, selectedSavedProperty, onEdit, onNotesChange }: ReviewStepProps) {
  const service = services.find((item) => item.id === draft.serviceId)?.name ?? draft.serviceName;
  const property = selectedSavedProperty ? (selectedSavedProperty.label || selectedSavedProperty.address.line1) : draft.propertyType ? draft.propertyType.charAt(0) + draft.propertyType.slice(1).toLowerCase() : "Not provided";
  const details = selectedSavedProperty
    ? [selectedSavedProperty.propertyType.charAt(0) + selectedSavedProperty.propertyType.slice(1).toLowerCase(), selectedSavedProperty.bedrooms === null ? "" : `${selectedSavedProperty.bedrooms} bedrooms`, selectedSavedProperty.bathrooms === null ? "" : `${selectedSavedProperty.bathrooms} bathrooms`].filter(Boolean).join(" · ")
    : [draft.bedrooms ? `${draft.bedrooms} bedrooms` : "", draft.bathrooms ? `${draft.bathrooms} bathrooms` : ""].filter(Boolean).join(" · ");
  const address = selectedSavedProperty
    ? [selectedSavedProperty.address.line1, selectedSavedProperty.address.line2, selectedSavedProperty.address.city, selectedSavedProperty.address.state, selectedSavedProperty.address.postalCode].filter(Boolean).join(", ")
    : [draft.addressLine1, draft.addressLine2, draft.city, draft.state, draft.postalCode].filter(Boolean).join(", ");
  const contact = [draft.customerName, draft.customerEmail, draft.customerPhone].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-semibold text-blue-950">Starting estimate</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-blue-700">{estimate.status === "success" ? `$${estimate.amount}` : "To be confirmed"}</p>
        <p className="mt-2 text-sm leading-6 text-blue-900/75">We’ll review your details and confirm availability and the final price personally.</p>
      </div>

      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">
        <SummaryRow label="Property" value={[property, address, details].filter(Boolean).join(" · ")} section="PROPERTY" onEdit={onEdit} />
        <SummaryRow label="Service" value={service} section="SERVICE" onEdit={onEdit} />
        <SummaryRow label="Preferred schedule" value={[draft.preferredDate, draft.preferredTimeWindow].filter(Boolean).join(" · ")} section="SCHEDULE" onEdit={onEdit} />
        {mode === "NEW_CUSTOMER" ? <SummaryRow label="Your details" value={[contact, address].filter(Boolean).join(" · ")} section="CONTACT" onEdit={onEdit} /> : <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Customer</p><p className="mt-1 text-sm font-medium text-slate-900">Returning customer — verified</p></div></div>}
      </div>

      {mode !== "NEW_CUSTOMER" ? <label className="block text-sm font-semibold text-slate-800">Anything we should know? <span className="font-normal text-slate-400">(optional)</span><textarea value={draft.customerNotes} onChange={(event) => onNotesChange(event.target.value)} rows={4} placeholder="Pets, gate instructions, parking notes, or areas needing special attention" className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label> : null}
      <p className="text-sm leading-6 text-slate-500">Your preferred date and time are not confirmed yet. We’ll review availability after you send your request.</p>
    </div>
  );
}
