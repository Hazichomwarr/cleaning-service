import { Phone } from "lucide-react";

type RequestProgressProps = {
  currentStep: number;
  totalSteps: number;
  label: string;
};

export default function RequestProgress({
  currentStep,
  totalSteps,
  label,
}: RequestProgressProps) {
  return (
    <div
      className="space-y-3"
      aria-label={`Progress: step ${currentStep} of ${totalSteps}`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-10 justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Step {currentStep} of {totalSteps}{" "}
            </p>
            <a
              href="tel:+19084145613"
              className="block gap-2 text-sm font-semibold text-slate-700"
            >
              <span className="text-sm underline">( Or call us here )</span>
            </a>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < currentStep ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
