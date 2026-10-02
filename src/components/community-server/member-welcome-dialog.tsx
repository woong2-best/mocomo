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
import { useCommunityMembership } from "@/components/community-server/community-membership-context";

export function MemberWelcomeDialog() {
  const { welcomeOpen, welcomePending, dismissWelcome, setWelcomeOpen } =
    useCommunityMembership();

  if (!welcomePending && !welcomeOpen) return null;

  return (
    <Dialog
      open={welcomeOpen}
      onOpenChange={(open) => {
        setWelcomeOpen(open);
        if (!open) void dismissWelcome();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{t("community-server.sznbes9")}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-2">
            {t("community-server.sb0kgj2")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={() => void dismissWelcome()}>
            {t("community-server.spf1pl9")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
