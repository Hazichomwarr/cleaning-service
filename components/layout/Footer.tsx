import { Clock3, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import Link from "next/link";

const navigationLinks = [
  { label: "Services", href: "#services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Request a Cleaning", href: "/request-cleaning" },
];

const serviceLinks = [
  "Standard Cleaning",
  "Deep Cleaning",
  "Move-In / Move-Out",
  "Office Cleaning",
  "Airbnb Turnover",
  "Post-Construction",
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-[1.3fr_0.7fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Sparkles aria-hidden="true" className="size-5" />
              </span>

              <span>
                <span className="block text-lg font-semibold tracking-tight">
                  Ab Clean
                </span>
                <span className="block text-xs text-slate-400">
                  Clean spaces. Happy places.
                </span>
              </span>
            </Link>

            <p className="mt-6 leading-7 text-slate-400">
              Thoughtful home and commercial cleaning, coordinated around your
              space, your schedule, and the details that matter.
            </p>

            <div className="mt-7 flex items-center gap-3">
              <a
                href="#"
                aria-label="Visit Brisa Clean on Instagram"
                className="flex size-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-blue-400 hover:bg-blue-400/10 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {/* <Instagram aria-hidden="true" className="size-5" /> */}
              </a>

              <a
                href="#"
                aria-label="Visit Brisa Clean on Facebook"
                className="flex size-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-blue-400 hover:bg-blue-400/10 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {/* <Facebook aria-hidden="true" className="size-5" /> */}
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Explore
            </h2>

            <ul className="mt-6 space-y-4">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Services
            </h2>

            <ul className="mt-6 space-y-4">
              {serviceLinks.map((service) => (
                <li key={service}>
                  <Link
                    href="/request-cleaning"
                    className="text-sm text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Contact
            </h2>

            <ul className="mt-6 space-y-5">
              <li>
                <a
                  href="tel:+17865550198"
                  className="flex items-start gap-3 text-sm text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Phone
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-blue-300"
                  />
                  <span>(786) 555-0198</span>
                </a>
              </li>

              <li>
                <a
                  href="mailto:hello@brisaclean.com"
                  className="flex items-start gap-3 text-sm text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Mail
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-blue-300"
                  />
                  <span>hello@brisaclean.com</span>
                </a>
              </li>

              <li className="flex items-start gap-3 text-sm text-slate-400">
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-blue-300"
                />
                <span>
                  Serving homes and businesses throughout the local area.
                </span>
              </li>

              <li className="flex items-start gap-3 text-sm text-slate-400">
                <Clock3
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-blue-300"
                />
                <span>
                  Monday–Saturday
                  <br />
                  8:00 AM–6:00 PM
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Brisa Clean. All rights reserved.</p>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link
              href="#"
              className="transition hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Privacy Policy
            </Link>

            <Link
              href="#"
              className="transition hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
