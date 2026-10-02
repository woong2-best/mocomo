"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  R18_LIVE_CATEGORY_BLOCKED_MSG,
  R18_LIVE_CATEGORY_BLOCKED_TITLE,
} from "@/lib/live-categories";

export function LiveR18BlockedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{R18_LIVE_CATEGORY_BLOCKED_TITLE}</DialogTitle>
          <DialogDescription>{R18_LIVE_CATEGORY_BLOCKED_MSG}</DialogDescription>
        </DialogHeader>
        <Button className="w-full rounded-full" onClick={() => onOpenChange(false)}>
          {t("auth.confirmAction")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
