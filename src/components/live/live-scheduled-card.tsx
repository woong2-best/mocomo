"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Radio } from "lucide-react";
import { startScheduledLiveStream } from "@/actions/live-stream";
import { Button } from "@/components/ui/button";
import { liveCategoryLabel } from "@/lib/live-categories";
import type { LiveStreamCategory } from "@prisma/client";

export function LiveScheduledCard({
  id,
  name,
  scheduledAt,
  category,
  isOwner,
}: {
  id: string;
  name: string;
  scheduledAt: Date;
  category: LiveStreamCategory;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function goLive() {
    startTransition(async () => {
      const res = await startScheduledLiveStream(id);
      if ("error" in res && res.error) {
        alert(res.error);
        return;
      }
      if (res.joinPassword) {
        sessionStorage.setItem(`mocomo_live_pw_${id}`, res.joinPassword);
      }
      router.push(`/voice/${id}`);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <p className="font-semibold text-sm line-clamp-2">{name}</p>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" />
        {new Date(scheduledAt).toLocaleString("ko-KR")}
      </p>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{liveCategoryLabel(category)}</span>
      {isOwner ? (
        <Button size="sm" className="w-full rounded-xl gap-1 mt-2" onClick={goLive} disabled={pending}>
          <Radio className="h-3.5 w-3.5" />
          {pending ? "시작 중…" : "지금 방송 시작"}
        </Button>
      ) : (
        <p className="text-[10px] text-muted-foreground">예약 방송 · 시작 대기</p>
      )}
    </div>
  );
}
