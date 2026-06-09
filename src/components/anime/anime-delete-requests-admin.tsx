"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveAnimeDeleteRequest } from "@/actions/anime";
import { Button } from "@/components/ui/button";
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
    const msg =
      status === "APPROVED"
        ? "이 문서를 삭제합니다. 계속할까요?"
        : "삭제 요청을 거절할까요?";
    if (!confirm(msg)) return;
    setBusy(id);
    await resolveAnimeDeleteRequest(id, status);
    setBusy(null);
    router.refresh();
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">대기 중인 삭제 요청이 없습니다.</p>;
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
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="rounded-lg"
                disabled={busy === r.id}
                onClick={() => void resolve(r.id, "APPROVED")}
              >
                승인·삭제
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={busy === r.id}
                onClick={() => void resolve(r.id, "REJECTED")}
              >
                거절
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.reason}</p>
        </div>
      ))}
    </div>
  );
}
