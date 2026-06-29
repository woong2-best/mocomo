"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { restoreAnimeRevision } from "@/actions/anime";
import { Button } from "@/components/ui/button";
import { InlineConfirm } from "@/components/ui/inline-confirm";

export function AnimeHistoryClient({
  slug,
  revisions,
}: {
  slug: string;
  revisions: {
    id: string;
    summary: string | null;
    createdAt: Date | string;
    editor: { username: string; name: string | null };
  }[];
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
      setError(res.error);
      return;
    }
    router.push(`/anime/${slug}`);
    router.refresh();
  }

  if (revisions.length === 0) {
    return <p className="text-sm text-muted-foreground">수정 기록이 없습니다.</p>;
  }

  return (
    <div className="space-y-2">
      {revisions.map((r) => (
        <div
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">
              {r.summary || "내용 수정"}{" "}
              <span className="text-muted-foreground font-normal">
                · @{r.editor.username}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(r.createdAt).toLocaleString("ko-KR")}
            </p>
          </div>
          <InlineConfirm
            message="이 버전으로 문서를 복구할까요?"
            confirmLabel="복구"
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
                {busy === r.id ? "복구 중…" : "이 버전으로 복구"}
              </Button>
            )}
          />
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
