import { BUSINESS } from "@/src/config/business";

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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Step {currentStep} of {totalSteps}
          </p>

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

      <div className="flex justify-end">
        <a
          href={`tel:${BUSINESS.phone.href}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-blue-700"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102A1.125 1.125 0 0 0 5.872 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
            />
          </svg>
          Prefer to book by phone?
          <span className="font-semibold text-blue-700">{BUSINESS.phone.display}</span>
        </a>
      </div>
    </div>
  );
}
