"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { restoreAnimeRevision } from "@/actions/anime";
import type { AnimeHistoryEntry } from "@/lib/anime-history";
import { Button } from "@/components/ui/button";
import { InlineConfirm } from "@/components/ui/inline-confirm";

function formatStamp(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function AnimeHistoryClient({
  slug,
  entries,
}: {
  slug: string;
  entries: AnimeHistoryEntry[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function restore(id: string) {
    setBusy(id);
    setError("");
    const res = await restoreAnimeRevision(id);
    setBusy(null);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    router.push(`/anime/${slug}`);
    router.refresh();
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("anime.s3wqsh3")}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("anime.s1xil4yk")}</p>
      <ol className="space-y-2">
        {entries.map((r, index) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2.5 text-sm"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium">
                <span className="text-muted-foreground font-normal mr-2">{index + 1}.</span>
                <span className="font-mono">@{r.username}</span>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatStamp(r.createdAt)}</p>
              <p className="text-xs text-muted-foreground">{r.summary || t("anime.s5ogtc8")}</p>
            </div>
            {r.restorable ? (
              <InlineConfirm
                message={t("anime.s1kj85fu")}
                confirmLabel={t("lib.moderation.sanctions.s278e353472")}
                pending={busy === r.id}
                onConfirm={() => restore(r.id)}
                renderTrigger={(open) => (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={busy === r.id}
                    onClick={open}
                  >
                    {busy === r.id ? t("anime.s1eeq5zy") : t("anime.sn34163")}
                  </Button>
                )}
              />
            ) : null}
          </li>
        ))}
      </ol>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
