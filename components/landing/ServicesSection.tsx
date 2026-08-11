import Image from "next/image";
import {
  Building2,
  Home,
  Hotel,
  MoveRight,
  Sparkles,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

const services = [
  {
    title: "Standard Cleaning",
    description:
      "Routine cleaning to keep your home fresh, tidy, and comfortable every week.",
    icon: Home,
    image: "/images/services/standard-cleaning.jpg",
  },
  {
    title: "Deep Cleaning",
    description:
      "A detailed top-to-bottom cleaning for kitchens, bathrooms, and every hard-to-reach space.",
    icon: Sparkles,
    image: "/images/services/deep-cleaning.jpg",
  },
  {
    title: "Move-In / Move-Out",
    description:
      "Leave your old home spotless or start fresh in your new one with confidence.",
    icon: MoveRight,
    image: "/images/services/move-cleaning.jpg",
  },
  {
    title: "Office Cleaning",
    description:
      "Professional cleaning services that create a healthier, more productive workplace.",
    icon: Building2,
    image: "/images/services/office-cleaning.jpg",
  },
  {
    title: "Airbnb Turnover",
    description:
      "Fast, reliable turnovers that keep your guests impressed and your ratings high.",
    icon: Hotel,
    image: "/images/services/airbnb.jpg",
  },
  {
    title: "Post-Construction",
    description:
      "Remove dust, debris, and construction residue for a move-in-ready finish.",
    icon: Warehouse,
    image: "/images/services/construction.jpg",
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Our Services
          </span>

          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Cleaning solutions for every space.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Whether it's your home, office, rental property, or a newly
            renovated space, our experienced team delivers exceptional results
            with attention to every detail.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <article
                key={service.title}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/95 text-blue-700 shadow-md backdrop-blur">
                    <service.icon className="h-6 w-6" />
                  </div>
                </div>

                <div className="p-8">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {service.title}
                  </h3>

                  <p className="mt-4 leading-7 text-slate-600">
                    {service.description}
                  </p>

                  <Link
                    href="/request"
                    className="mt-8 inline-flex items-center gap-2 font-semibold text-blue-700 transition hover:gap-3"
                  >
                    Request this service
                    <MoveRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-20 rounded-4xl bg-slate-900 px-8 py-12 text-center text-white lg:px-16">
          <div className="mx-auto max-w-3xl">
            <h3 className="text-3xl font-semibold">
              Need something more specific?
            </h3>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Every property is different. Tell us about your cleaning needs,
              and we'll prepare a customized service plan that fits your home or
              business.
            </p>

            <Link
              href="/request"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white transition hover:bg-blue-700"
            >
              Get Your Free Quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
