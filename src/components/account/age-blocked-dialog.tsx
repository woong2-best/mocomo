"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export type AgeBlockedKind = "r18" | "qna" | "nsfw-view" | "money-missing" | "money-underage";

const PROFILE_BIRTH_DATE = "/settings/profile";

function DateOfBirthLink({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Link
      href={PROFILE_BIRTH_DATE}
      className="font-semibold text-orange-500 underline-offset-2 hover:underline"
      onClick={onNavigate}
    >
      {t("moneyAge.dateOfBirthLink")}
    </Link>
  );
}

function HighlightWithBirthDate({
  word,
  onNavigate,
}: {
  word: string;
  onNavigate: () => void;
}) {
  return (
    <span className="whitespace-nowrap">
      {word} <DateOfBirthLink onNavigate={onNavigate} />
    </span>
  );
}

function AgeBlockedBody({
  kind,
  onNavigate,
}: {
  kind: AgeBlockedKind;
  onNavigate: () => void;
}) {
  if (kind === "r18") {
    return (
      <>
        Only users aged 19+ by the birth date on their profile can use{" "}
        <HighlightWithBirthDate word="R-18" onNavigate={onNavigate} />{" "}
        <HighlightWithBirthDate word="categories" onNavigate={onNavigate} />.
      </>
    );
  }
  if (kind === "qna") {
    return (
      <>
        Only users aged 19+ by the birth date on their profile can use{" "}
        <HighlightWithBirthDate word="NSFW" onNavigate={onNavigate} />{" "}
        <HighlightWithBirthDate word="categories" onNavigate={onNavigate} />.
      </>
    );
  }
  if (kind === "nsfw-view") {
    return (
      <>
        Only users aged 19+ by the birth date on their profile can view{" "}
        <HighlightWithBirthDate word="NSFW" onNavigate={onNavigate} /> posts.
      </>
    );
  }
  if (kind === "money-underage") {
    return (
      <>
        Payments, tips, and transfers are only available to users 18 or older.{" "}
        <DateOfBirthLink onNavigate={onNavigate} />
      </>
    );
  }
  return (
    <>
      Add your date of birth to use payments, tips, and transfers.{" "}
      <DateOfBirthLink onNavigate={onNavigate} />
    </>
  );
}

function ageBlockedTitle(kind: AgeBlockedKind) {
  if (kind === "money-missing" || kind === "money-underage") {
    return t("moneyAge.bannerMissingTitle");
  }
  return t("lib.live.categories.s1952ce4ab6");
}

export function AgeBlockedDialog({
  open,
  onOpenChange,
  kind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: AgeBlockedKind;
}) {
  const close = () => onOpenChange(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ageBlockedTitle(kind)}</DialogTitle>
          <DialogDescription asChild>
            <p>
              <AgeBlockedBody kind={kind} onNavigate={close} />
            </p>
          </DialogDescription>
        </DialogHeader>
        <Button className="w-full rounded-full" onClick={close}>
          {t("auth.confirmAction")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
