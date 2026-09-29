"use client";

import { useState } from "react";
import { PaymentLegalNoticeContent } from "@/components/legal/legal-entity-notice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Shown before the link, e.g. "광고 등록 시" vs "결제 시" */
  actionLabel?: string;
};

/** Muted one-line consent; full disclosure opens in a dialog. */
export function PaymentLegalConsentModal({
  className,
  actionLabel = "광고 등록 시",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <p className={cn("text-center text-[11px] leading-snug text-muted-foreground", className)}>
        {actionLabel}{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-primary/90 underline-offset-2 hover:text-primary hover:underline"
        >
          이용약관 및 고지사항
        </button>
        에 동의하는 것으로 간주됩니다.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground">사업자·약관 고지</DialogTitle>
          </DialogHeader>
          <PaymentLegalNoticeContent compact />
        </DialogContent>
      </Dialog>
    </>
  );
}
