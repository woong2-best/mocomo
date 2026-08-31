"use client";

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
          <DialogTitle>본인인증 필요</DialogTitle>
          <DialogDescription>{ADULT_VERIFICATION_REQUIRED_MSG}</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full rounded-full" disabled={busy} onClick={onVerify}>
          {busy ? "인증 진행 중…" : "본인인증 시작"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
