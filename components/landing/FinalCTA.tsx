import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Phone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const assurances = [
  "No obligation to book",
  "Availability confirmed personally",
  "Clear pricing before the visit",
];

export default function FinalCTA() {
  return (
    <section
      id="request-cleaning"
      className="overflow-hidden bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-blue-600 px-6 py-14 text-white sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-28 -left-20 size-80 rounded-full bg-slate-950/10 blur-3xl"
          />

          <div className="relative grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50">
                <Sparkles aria-hidden="true" className="size-4" />
                Your clean space starts here
              </div>

              <h2 className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Ready to take cleaning
                <span className="block text-blue-100">
                  off your to-do list?
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-50">
                Send us a few details about your home or business. We’ll review
                your request, confirm availability, and take care of the rest.
              </p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                {assurances.map((assurance) => (
                  <li
                    key={assurance}
                    className="flex items-start gap-3 text-sm font-medium text-blue-50"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0"
                    />
                    <span>{assurance}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/request"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-blue-600"
              >
                <CalendarDays aria-hidden="true" className="size-5" />
                Request Your Cleaning
                <ArrowRight aria-hidden="true" className="size-5" />
              </Link>

              <a
                href="tel:+19084145613"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-4 font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-blue-600"
              >
                <Phone aria-hidden="true" className="size-5" />
                Call (908) 414 5613
              </a>
            </div>
          </div>

          <div className="relative mt-12 border-t border-white/15 pt-6">
            <p className="text-sm leading-6 text-blue-100">
              Serving homes, offices, rental properties, and commercial spaces
              throughout the local area.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
