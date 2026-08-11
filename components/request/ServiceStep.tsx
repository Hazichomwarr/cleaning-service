import { Check } from "lucide-react";
import type { CatalogItem } from "@/src/types/cleaning-request-draft";

type ServiceStepProps = {
  services: CatalogItem[];
  selectedId: string;
  onSelect: (service: CatalogItem) => void;
};

export default function ServiceStep({ services, selectedId, onSelect }: ServiceStepProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="font-semibold">Services are temporarily unavailable.</p>
        <p className="mt-2 text-sm leading-6 text-amber-900/80">Please call us and we will help arrange your cleaning.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => {
        const selected = service.id === selectedId;

        return (
          <button
            key={service.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(service)}
            className={`group rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
              selected
                ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-100"
                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            }`}
          >
            <span className="flex items-start justify-between gap-4">
              <span>
                <span className="block font-semibold text-slate-950">{service.name}</span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">{service.description}</span>
              </span>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-transparent"}`}>
                <Check className="size-3.5" aria-hidden="true" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
