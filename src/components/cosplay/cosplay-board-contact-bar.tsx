"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { getOrCreateDM } from "@/actions/chat";
import { Button } from "@/components/ui/button";

export function CosplayBoardContactBar({
  authorId,
  authorUsername,
  postTitle,
  isSignedIn,
  canMessage = true,
}: {
  authorId: string;
  authorUsername: string;
  postTitle: string;
  isSignedIn: boolean;
  canMessage?: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function contact() {
    setError("");
    startTransition(async () => {
      const res = await getOrCreateDM(authorId);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      if ("roomId" in res && res.roomId) {
        window.location.href = `/messages/${res.roomId}`;
      }
    });
  }

  return (
    <div className="px-4 py-3 border-t border-[#d6d6d6] dark:border-border bg-[#f0f4ff] dark:bg-muted/30 flex flex-wrap items-center gap-3">
      <p className="text-xs text-muted-foreground flex-1 min-w-[12rem]">
        「{postTitle}」 문의 — @{authorUsername}
      </p>
      {isSignedIn && canMessage ? (
        <Button
          type="button"
          size="sm"
          className="rounded-lg gap-1.5"
          disabled={pending}
          onClick={contact}
        >
          <Mail className="h-3.5 w-3.5" />
          {pending ? t("discovery.seed2mt") : t("cosplay.sy6i8yh")}
        </Button>
      ) : (
        <Button size="sm" variant="secondary" className="rounded-lg" asChild>
          <Link href={`/auth/signin?callbackUrl=/u/${authorUsername}`}>{t("cosplay.s1j6pm0w")}</Link>
        </Button>
      )}
      {error && <p className="text-xs text-destructive w-full">{error}</p>}
    </div>
  );
}
