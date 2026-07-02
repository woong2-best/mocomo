"use client";

import { useState } from "react";
import type { HumanChallengeQuestion } from "@/lib/human-challenge-types";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/messages";

type SignupHumanChallengeProps = {
  challenge: HumanChallengeQuestion;
  loading?: boolean;
  onRefresh: () => void;
  onSelect: (choiceId: string) => void;
  selectedId: string;
  locale?: Locale;
};

export function SignupHumanChallenge({
  challenge,
  loading,
  onRefresh,
  onSelect,
  selectedId,
  locale: localeOverride,
}: SignupHumanChallengeProps) {
  const { t: ctxT } = useLocale();
  const t = localeOverride ? createTranslator(localeOverride) : ctxT;
  const [shake, setShake] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-emerald-500/10 to-sky-500/10 border border-border p-4 text-center">
        <p className="text-xs font-medium text-muted-foreground mb-1">{t("auth.humanQuizBadge")}</p>
        <p className="text-lg font-bold">{challenge.prompt}</p>
        {challenge.hint ? (
          <p className="text-xs text-muted-foreground mt-1">{challenge.hint}</p>
        ) : null}
      </div>
      <div
        className={`grid grid-cols-2 gap-2 ${shake ? "animate-pulse" : ""}`}
        onAnimationEnd={() => setShake(false)}
      >
        {challenge.choices.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant={selectedId === c.id ? "default" : "outline"}
            className="rounded-xl h-auto py-3 text-sm font-medium"
            disabled={loading}
            onClick={() => {
              onSelect(c.id);
              setShake(false);
            }}
          >
            {c.label}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        disabled={loading}
        onClick={onRefresh}
      >
        {t("auth.humanQuizRefresh")}
      </Button>
    </div>
  );
}
