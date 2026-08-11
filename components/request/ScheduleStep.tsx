type ScheduleStepProps = {
  preferredDate: string;
  preferredTimeWindow: string;
  onDateChange: (date: string) => void;
  onTimeChange: (timeWindow: string) => void;
};

const timeWindows = ["Morning", "Afternoon", "Evening", "Flexible"];

function todayString() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
}

export default function ScheduleStep({
  preferredDate,
  preferredTimeWindow,
  onDateChange,
  onTimeChange,
}: ScheduleStepProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-[1fr_1.2fr]">
        <label className="block text-sm font-semibold text-slate-900">
          Preferred date
          <input
            type="date"
            min={todayString()}
            value={preferredDate}
            onChange={(event) => onDateChange(event.target.value)}
            className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div>
          <p className="text-sm font-semibold text-slate-900">Preferred time window</p>
          <p className="mt-1 text-sm text-slate-500">We will confirm the final arrival time with you.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {timeWindows.map((timeWindow) => (
              <button
                key={timeWindow}
                type="button"
                aria-pressed={preferredTimeWindow === timeWindow}
                onClick={() => onTimeChange(timeWindow)}
                className={`min-h-12 rounded-xl border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${preferredTimeWindow === timeWindow ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"}`}
              >
                {timeWindow}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
        Your date and time are preferences, not a confirmed appointment. The Just Cleaning team will review availability before confirming your visit.
      </div>
    </div>
  );
}
