import type { CatalogItem, CleaningRequestDraft } from "@/src/types/cleaning-request-draft";
import type { EstimateState } from "./EstimateCard";

type ReviewStepProps = {
  draft: CleaningRequestDraft;
  services: CatalogItem[];
  extras: CatalogItem[];
  estimate: EstimateState;
  onEdit: (step: number) => void;
};

function SummaryRow({ label, value, step, onEdit }: { label: string; value: string; step: number; onEdit: (step: number) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{value || "Not provided"}</p>
      </div>
      <button type="button" onClick={() => onEdit(step)} className="text-sm font-semibold text-blue-700 hover:text-blue-900">Edit</button>
    </div>
  );
}

export default function ReviewStep({ draft, services, extras, estimate, onEdit }: ReviewStepProps) {
  const service = services.find((item) => item.id === draft.serviceId)?.name ?? draft.serviceName;
  const selectedExtras = extras.filter((item) => draft.extraIds.includes(item.id)).map((item) => item.name).join(", ");
  const property = draft.propertyType ? draft.propertyType.charAt(0) + draft.propertyType.slice(1).toLowerCase() : "Not provided";
  const details = [draft.bedrooms ? `${draft.bedrooms} bedrooms` : "", draft.bathrooms ? `${draft.bathrooms} bathrooms` : ""].filter(Boolean).join(" · ");
  const address = [draft.addressLine1, draft.addressLine2, draft.city, draft.state, draft.postalCode].filter(Boolean).join(", ");
  const contact = [draft.customerName, draft.customerEmail, draft.customerPhone].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-semibold text-blue-950">Starting estimate</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-blue-700">
          {estimate.status === "success" ? `$${estimate.amount}` : "To be confirmed"}
        </p>
        <p className="mt-2 text-sm leading-6 text-blue-900/75">We’ll review your details and confirm availability and the final price personally.</p>
      </div>

      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">
        <SummaryRow label="Service" value={service} step={0} onEdit={onEdit} />
        <SummaryRow label="Property" value={[property, details].filter(Boolean).join(" · ")} step={1} onEdit={onEdit} />
        <SummaryRow label="Extras" value={selectedExtras || "No extras selected"} step={2} onEdit={onEdit} />
        <SummaryRow label="Preferred schedule" value={[draft.preferredDate, draft.preferredTimeWindow].filter(Boolean).join(" · ")} step={3} onEdit={onEdit} />
        <SummaryRow label="Your details" value={[contact, address].filter(Boolean).join(" · ")} step={4} onEdit={onEdit} />
      </div>

      <p className="text-sm leading-6 text-slate-500">Submitting is not available just yet. Your request details stay in this form while we finish the secure request connection.</p>
    </div>
  );
}
