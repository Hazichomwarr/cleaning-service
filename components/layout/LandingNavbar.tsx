"use client";

import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import BusinessLogo from "@/components/branding/BusinessLogo";
import { BUSINESS } from "@/src/config/business";

const navigationItems = [
  { label: "Services", href: "#services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

export default function LandingNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"
      >
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4"
        >
          <BusinessLogo size={112} priority />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <ul className="flex items-center gap-7">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-slate-700 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <a
            href={`tel:${BUSINESS.phone.href}`}
            className="flex items-center gap-2 text-sm font-semibold text-slate-800 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4"
          >
            <Phone aria-hidden="true" className="size-4 text-green-600" />
            <span>{BUSINESS.phone.display}</span>
          </a>

          <Link
            href="#request-cleaning"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4"
          >
            Request a Cleaning
          </Link>
        </div>

        <button
          type="button"
          aria-label={
            isMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
          className="flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 lg:hidden"
        >
          {isMenuOpen ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
      </nav>

      {isMenuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-5">
            <ul className="flex flex-col gap-1">
              {navigationItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-slate-800 transition hover:bg-slate-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <a
              href={`tel:${BUSINESS.phone.href}`}
              className="flex items-center gap-3 rounded-lg px-3 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Phone aria-hidden="true" className="size-5 text-blue-600" />
              <span>{BUSINESS.phone.display}</span>
            </a>

            <Link
              href="#request-cleaning"
              onClick={closeMenu}
              className="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Request a Cleaning
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
