import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    eyebrow: "Tell us what you need",
    title: "A request shaped around your space.",
    description:
      "Choose your cleaning service, describe the property, and add any details that will help us prepare properly.",
    icon: ClipboardList,
  },
  {
    number: "02",
    eyebrow: "Choose your preference",
    title: "Your schedule comes first.",
    description:
      "Select the day and arrival window that work best. We review availability before confirming the appointment.",
    icon: CalendarDays,
  },
  {
    number: "03",
    eyebrow: "We coordinate everything",
    title: "The right cleaner, fully prepared.",
    description:
      "Once confirmed, we organize the visit, assign the right professional, and make sure every instruction is clear.",
    icon: UserRoundCheck,
  },
];

const requestDetails = [
  "Deep cleaning",
  "3 bedrooms · 2 bathrooms",
  "Friday, 10:00 AM–12:00 PM",
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="overflow-hidden bg-slate-950 py-24 text-white sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
              A simpler way to book
            </p>

            <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Beautifully clean,
              <span className="block text-blue-300">
                effortlessly arranged.
              </span>
            </h2>

            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-300">
              No long phone calls. No unclear scheduling. Just a thoughtful
              request experience designed around your home, your business, and
              your time.
            </p>

            <Link
              href="#request-cleaning"
              className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
            >
              Request Your Cleaning
              <ArrowRight aria-hidden="true" className="size-5" />
            </Link>

            <div className="mt-12 hidden max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-blue-400/15 text-blue-300">
                  <Sparkles aria-hidden="true" className="size-5" />
                </span>

                <div>
                  <p className="font-semibold">Personal, not automated</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Every request is reviewed before confirmation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <ol className="space-y-5">
              {steps.map((step) => {
                const Icon = step.icon;

                return (
                  <li
                    key={step.number}
                    className="group rounded-4xl border border-white/10 bg-white/4 p-6 transition duration-300 hover:border-blue-400/40 hover:bg-white/[0.07] sm:p-8"
                  >
                    <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                      <div className="flex items-start justify-between gap-6 sm:block">
                        <span className="text-sm font-semibold tracking-[0.2em] text-blue-300">
                          {step.number}
                        </span>

                        <span className="mt-5 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-300 transition group-hover:border-blue-400/30 group-hover:bg-blue-400/10">
                          <Icon aria-hidden="true" className="size-6" />
                        </span>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-blue-300">
                          {step.eyebrow}
                        </p>

                        <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                          {step.title}
                        </h3>

                        <p className="mt-4 max-w-xl leading-7 text-slate-300">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="relative mt-8 overflow-hidden rounded-4xl bg-blue-700 p-6 sm:p-8">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl"
              />

              <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
                    Your request
                  </p>

                  <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">
                    Everything clear before we arrive.
                  </h3>

                  <ul className="mt-6 space-y-3">
                    {requestDetails.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-center gap-3 text-blue-50"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                          <Check aria-hidden="true" className="size-4" />
                        </span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-white p-5 text-slate-950 shadow-xl md:w-56">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Request status
                    </span>

                    <span className="size-2.5 rounded-full bg-amber-400" />
                  </div>

                  <p className="mt-3 text-lg font-semibold">Under review</p>

                  <div className="my-5 h-px bg-slate-200" />

                  <p className="text-sm text-slate-500">
                    Preferred appointment
                  </p>
                  <p className="mt-1 font-semibold">Friday morning</p>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    We’ll confirm availability and final details shortly.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-400">
              Preferred appointment times are confirmed after review.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
