"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ADULT_VERIFICATION_REQUIRED_MSG } from "@/lib/adult-verification/constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: () => void;
  busy?: boolean;
  error?: string;
};

export function AdultVerificationDialog({ open, onOpenChange, onVerify, busy, error }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("adult-verification.s2vazhn")}</DialogTitle>
          <DialogDescription>{ADULT_VERIFICATION_REQUIRED_MSG}</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full rounded-full" disabled={busy} onClick={onVerify}>
          {busy ? t("adult-verification.s19jsxmd") : t("adult-verification.s2v7uz4")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
