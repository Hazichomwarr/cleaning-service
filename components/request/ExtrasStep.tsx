import { Check } from "lucide-react";
import type { CatalogItem } from "@/src/types/cleaning-request-draft";

type ExtrasStepProps = {
  extras: CatalogItem[];
  selectedIds: string[];
  onToggle: (extraId: string) => void;
};

export default function ExtrasStep({ extras, selectedIds, onToggle }: ExtrasStepProps) {
  if (extras.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <p className="font-semibold text-slate-950">No additional options right now.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">You can continue and tell us anything important in your notes later.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">Select any details you would like the team to review. Extras are confirmed with your final price.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {extras.map((extra) => {
          const selected = selectedIds.includes(extra.id);

          return (
            <button
              key={extra.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(extra.id)}
              className={`flex min-h-24 items-start justify-between gap-4 rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"}`}
            >
              <span>
                <span className="block font-semibold text-slate-950">{extra.name}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">{extra.description}</span>
              </span>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-transparent"}`}>
                <Check className="size-3.5" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
