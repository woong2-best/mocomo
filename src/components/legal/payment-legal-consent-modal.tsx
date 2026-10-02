"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
  /** Shown before the link, e.g. t("legal.sv12nkp") vs t("legal.smlg5k8") */
  actionLabel?: string;
};

/** Muted one-line consent; full disclosure opens in a dialog. */
export function PaymentLegalConsentModal({
  className,
  actionLabel = t("legal.sv12nkp"),
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
          {t("legal.srmlc0q")}
        </button>
        {t("legal.s1cldh83")}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground">{t("legal.sk4z3b1")}</DialogTitle>
          </DialogHeader>
          <PaymentLegalNoticeContent compact />
        </DialogContent>
      </Dialog>
    </>
  );
}
