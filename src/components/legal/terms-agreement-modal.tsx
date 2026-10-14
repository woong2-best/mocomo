"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type TermsAgreementInfo = {
  versionTag: string;
  effectiveDate: string;
  termsUrl: string;
};

export function TermsAgreementModal({
  open,
  terms,
  accepting,
  onAccept,
  onDecline,
}: {
  open: boolean;
  terms: TermsAgreementInfo;
  accepting: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!open) {
      setAgreed(false);
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-update-title"
    >
      <div className="folk-card w-full max-w-lg bg-folk-cream p-6 shadow-folk">
        <h2
          id="terms-update-title"
          className="font-display text-xl font-bold text-folk-cobalt"
        >
          Notice of Updated Terms of Service
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Hi there, we have updated our Terms of Service to comply with updated legal
          standards and improve our operations.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Please review the changes through the link below before continuing:
        </p>
        <p className="mt-3 text-sm leading-relaxed">
          👉{" "}
          <a
            href={terms.termsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-2"
          >
            Review the Revised Terms of Service (Effective Date: {terms.effectiveDate})
          </a>
        </p>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            By clicking &quot;Accept and Continue&quot;, you agree to the revised Terms.
          </li>
          <li>
            If you do not agree, you will no longer be able to access our services, and you
            may choose to close your account.
          </li>
        </ul>
        <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm leading-snug">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          <span>I agree to the updated Terms of Service. (Required)</span>
        </label>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onDecline}
            disabled={accepting}
          >
            Decline / Close Account
          </Button>
          <Button
            type="button"
            onClick={onAccept}
            disabled={!agreed || accepting}
          >
            {accepting ? "Saving…" : "Accept and Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
