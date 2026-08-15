"use client";

import { useState } from "react";
import type { CatalogItem } from "@/src/types/cleaning-request-draft";
import CleaningRequestForm from "./CleaningRequestForm";
import ReturningCustomerVerification from "./ReturningCustomerVerification";

export default function RequestExperience({ services, extras }: { services: CatalogItem[]; extras: CatalogItem[] }) {
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:pt-12 lg:px-8 lg:pt-16">
        <ReturningCustomerVerification onPropertySelect={setSavedPropertyId} />
      </div>
      <CleaningRequestForm services={services} extras={extras} savedPropertyId={savedPropertyId} />
    </>
  );
}
