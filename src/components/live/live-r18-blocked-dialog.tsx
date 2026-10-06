"use client";

import { AgeBlockedDialog } from "@/components/account/age-blocked-dialog";

export function LiveR18BlockedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return <AgeBlockedDialog open={open} onOpenChange={onOpenChange} kind="r18" />;
}
