import { Award, Clock3, Leaf, ShieldCheck } from "lucide-react";

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Trusted & Insured",
    description: "Fully vetted professionals you can rely on.",
  },
  {
    icon: Clock3,
    title: "Flexible Scheduling",
    description: "Book a time that fits your busy lifestyle.",
  },
  {
    icon: Leaf,
    title: "Eco-Friendly Products",
    description: "Safe cleaning solutions for families and pets.",
  },
  {
    icon: Award,
    title: "100% Satisfaction",
    description: "We're not happy until your space shines.",
  },
];

export default function TrustBar() {
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Icon className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
