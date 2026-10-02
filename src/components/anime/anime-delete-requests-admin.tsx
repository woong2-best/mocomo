"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveAnimeDeleteRequest } from "@/actions/anime";
import { Button } from "@/components/ui/button";
import { InlineConfirm } from "@/components/ui/inline-confirm";
import Link from "next/link";

export function AnimeDeleteRequestsAdmin({
  requests,
}: {
  requests: {
    id: string;
    reason: string;
    createdAt: Date | string;
    anime: { slug: string; title: string };
    requester: { username: string };
  }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function resolve(id: string, status: "APPROVED" | "REJECTED") {
    setBusy(id);
    await resolveAnimeDeleteRequest(id, status);
    setBusy(null);
    router.refresh();
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("anime.s1f80m6u")}</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="rounded-xl border border-border p-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link href={`/anime/${r.anime.slug}`} className="font-semibold hover:underline">
                {r.anime.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-1">
                요청자 @{r.requester.username} · {new Date(r.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <InlineConfirm
                message={t("anime.ssq050")}
                confirmLabel={t("anime.s57iq4n")}
                pending={busy === r.id}
                onConfirm={() => void resolve(r.id, "APPROVED")}
                renderTrigger={(request) => (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-lg"
                    disabled={busy === r.id}
                    onClick={request}
                  >
                    {t("anime.s57iq4n")}
                  </Button>
                )}
              />
              <InlineConfirm
                message={t("anime.sonp7x1")}
                confirmLabel={t("collab.reject")}
                variant="outline"
                pending={busy === r.id}
                onConfirm={() => void resolve(r.id, "REJECTED")}
                renderTrigger={(request) => (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={busy === r.id}
                    onClick={request}
                  >
                    {t("collab.reject")}
                  </Button>
                )}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.reason}</p>
        </div>
      ))}
    </div>
  );
}
