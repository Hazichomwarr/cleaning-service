"use client";

import { useState } from "react";
import type { CatalogItem } from "@/src/types/cleaning-request-draft";
import type { VerifiedCustomerPropertyOption } from "@/src/services/verified-customer-properties.service";
import CleaningRequestForm from "./CleaningRequestForm";
import ReturningCustomerVerification, { type ReturningCustomerVerificationState } from "./ReturningCustomerVerification";
import type { RequestFlowMode } from "@/src/lib/request-flow";

export default function RequestExperience({ services, extras }: { services: CatalogItem[]; extras: CatalogItem[] }) {
  const [mode, setMode] = useState<RequestFlowMode>("NEW_CUSTOMER");
  const [verificationState, setVerificationState] = useState<ReturningCustomerVerificationState>("UNVERIFIED");
  const [selectedProperty, setSelectedProperty] = useState<VerifiedCustomerPropertyOption | null>(null);
  const [verificationResetSignal, setVerificationResetSignal] = useState(0);

  const onVerificationStateChange = (state: ReturningCustomerVerificationState) => {
    setVerificationState(state);
    if (state === "UNVERIFIED") {
      setMode("NEW_CUSTOMER");
      setSelectedProperty(null);
    }
  };

  const chooseSavedProperty = (property: VerifiedCustomerPropertyOption) => {
    setSelectedProperty(property);
    setMode("RETURNING_SAVED_PROPERTY");
  };

  const chooseDifferentProperty = () => {
    setSelectedProperty(null);
    setMode("RETURNING_NEW_PROPERTY");
  };

  const showPropertyChooser = () => {
    document.getElementById("returning-property-chooser")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:pt-12 lg:px-8 lg:pt-16">
        <ReturningCustomerVerification key={verificationResetSignal} onStateChange={onVerificationStateChange} onPropertySelect={chooseSavedProperty} onDifferentProperty={chooseDifferentProperty} />
      </div>
      {verificationState === "VERIFIED_CHOOSING_PROPERTY" ? (
        <p className="mx-auto max-w-4xl px-5 pb-16 text-center text-sm text-slate-500">Choose a saved property above to start your shorter request, or continue with a different property.</p>
      ) : (
        <CleaningRequestForm
          services={services}
          extras={extras}
          mode={mode}
          selectedSavedProperty={selectedProperty}
          onChangeProperty={showPropertyChooser}
          onRequestAnother={() => {
            if (mode === "NEW_CUSTOMER") return;
            setSelectedProperty(null);
            setMode("NEW_CUSTOMER");
            setVerificationState("VERIFIED_CHOOSING_PROPERTY");
          }}
          onReturningCustomerRecovery={() => {
            setSelectedProperty(null);
            setMode("NEW_CUSTOMER");
            setVerificationState("UNVERIFIED");
            setVerificationResetSignal((value) => value + 1);
          }}
        />
      )}
    </>
  );
}
