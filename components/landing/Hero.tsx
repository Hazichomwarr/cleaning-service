import { ArrowRight, CalendarDays, Check, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const trustPoints = [
  "Trusted & Insured",
  "Satisfaction Guaranteed",
  "Eco-Friendly Products",
];

export default function Hero() {
  return (
    <section className="overflow-hidden bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
        <div className="relative z-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Professional cleaning services
          </p>

          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            A cleaner space,
            <span className="block">without the stress.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Professional home and commercial cleaning, scheduled around your
            life.
          </p>

          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-3">
            {trustPoints.map((point) => (
              <li
                key={point}
                className="flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check aria-hidden="true" className="size-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/request"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4"
            >
              <CalendarDays aria-hidden="true" className="size-5" />
              Request Your Cleaning
            </Link>

            <Link
              href="#services"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4"
            >
              View Services
              <ArrowRight aria-hidden="true" className="size-5" />
            </Link>
          </div>

          <div className="mt-7 flex items-center gap-3 text-sm text-slate-700">
            <div
              className="flex items-center gap-1 text-amber-500"
              aria-label="5 out of 5 stars"
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  aria-hidden="true"
                  className="size-4 fill-current"
                />
              ))}
            </div>

            <span>
              <strong className="font-semibold text-slate-950">
                5.0 stars
              </strong>{" "}
              from 120+ happy customers
            </span>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -left-8 top-10 size-48 rounded-full bg-blue-100 blur-3xl"
          />

          <div className="relative overflow-hidden rounded-3xl bg-slate-100">
            <Image
              src="/images/cleaning-hero.png"
              alt="Professional cleaner wiping a kitchen countertop in a bright home"
              width={1792}
              height={832}
              priority
              className="h-auto min-h-90 w-full object-cover object-center sm:min-h-115 lg:min-h-140"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>

          <div className="absolute bottom-5 left-5 hidden max-w-57.5 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lg backdrop-blur sm:block">
            <p className="text-sm font-semibold text-slate-950">
              Easy online requests
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Tell us what you need and choose your preferred time in minutes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
