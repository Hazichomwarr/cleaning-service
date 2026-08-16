import EstimateCard, { type EstimateState } from "./EstimateCard";
import type { CleaningRequestDraft, PropertyType } from "@/src/types/cleaning-request-draft";

const propertyOptions: Array<{ value: PropertyType; label: string; description: string }> = [
  { value: "HOUSE", label: "House", description: "A home with its own entrance." },
  { value: "APARTMENT", label: "Apartment", description: "An apartment, condo, or unit." },
  { value: "AIRBNB", label: "Airbnb", description: "A short-term rental property." },
  { value: "OFFICE", label: "Office", description: "A workplace or professional space." },
  { value: "COMMERCIAL", label: "Commercial space", description: "A larger business property." },
  { value: "OTHER", label: "Other", description: "Something that needs a closer look." },
];

const bedroomOptions = [1, 2, 3, 4];
const bathroomOptions = ["1", "1.5", "2", "2.5", "3", "3.5", "4+"];

type PropertyStepProps = {
  draft: CleaningRequestDraft;
  estimate: EstimateState;
  onPropertyTypeChange: (propertyType: PropertyType) => void;
  onBedroomsChange: (bedrooms: number | undefined) => void;
  onBathroomsChange: (bathrooms: string) => void;
};

export default function PropertyStep({
  draft,
  estimate,
  onPropertyTypeChange,
  onBedroomsChange,
  onBathroomsChange,
}: PropertyStepProps) {
  const residential = draft.propertyType === "HOUSE" || draft.propertyType === "APARTMENT" || draft.propertyType === "AIRBNB";

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900">What kind of property is it?</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {propertyOptions.map((option) => {
            const selected = draft.propertyType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onPropertyTypeChange(option.value)}
                className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${selected ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-100" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"}`}
              >
                <span className="block font-semibold text-slate-950">{option.label}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {residential ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-8">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900">Bedrooms</legend>
              <p className="mt-1 text-sm text-slate-500">This helps us show your starting estimate.</p>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {bedroomOptions.map((bedroom) => (
                  <button
                    key={bedroom}
                    type="button"
                    aria-pressed={draft.bedrooms === bedroom}
                    onClick={() => onBedroomsChange(bedroom)}
                    className={`min-h-12 rounded-xl border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${draft.bedrooms === bedroom ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"}`}
                  >
                    {bedroom}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={draft.bedrooms !== undefined && draft.bedrooms >= 5}
                  onClick={() => onBedroomsChange(draft.bedrooms && draft.bedrooms >= 5 ? draft.bedrooms : 5)}
                  className={`min-h-12 rounded-xl border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${draft.bedrooms !== undefined && draft.bedrooms >= 5 ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"}`}
                >
                  5+
                </button>
              </div>
              {draft.bedrooms !== undefined && draft.bedrooms >= 5 ? (
                <label className="mt-3 block text-sm font-medium text-slate-700">
                  Actual bedroom count
                  <input
                    type="number"
                    min={5}
                    step={1}
                    value={draft.bedrooms}
                    onChange={(event) => onBedroomsChange(event.target.value ? Number(event.target.value) : undefined)}
                    className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ) : null}
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-slate-900">Bathrooms <span className="font-normal text-slate-400">(optional)</span></legend>
              <p className="mt-1 text-sm text-slate-500">Bathrooms help us understand your space but do not change this starting estimate. You can leave this blank.</p>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {bathroomOptions.map((bathroom) => (
                  <button
                    key={bathroom}
                    type="button"
                    aria-pressed={draft.bathrooms === bathroom}
                    onClick={() => onBathroomsChange(bathroom)}
                    className={`min-h-11 rounded-xl border px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${draft.bathrooms === bathroom ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"}`}
                  >
                    {bathroom}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <EstimateCard state={estimate} />
        </div>
      ) : draft.propertyType ? (
        <EstimateCard state={estimate} />
      ) : null}
    </div>
  );
}
