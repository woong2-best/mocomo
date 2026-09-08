"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { unbanLiveChatUserAction } from "@/actions/broadcast-roles";
import { Loader2 } from "lucide-react";

type BanRow = {
  userId: string;
  username: string;
  image: string | null;
  bannedBy: string;
  reason: string | null;
  at: string;
};

export function LiveChatBansPanel({ channelId }: { channelId: string }) {
  const [bans, setBans] = useState<BanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/live/${channelId}/moderation`);
    const data = await res.json();
    if (res.ok) setBans(data.bans ?? []);
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function unban(userId: string) {
    await unbanLiveChatUserAction(channelId, userId);
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (bans.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">차단된 사용자가 없습니다.</p>;
  }

  return (
    <div className="space-y-2">
      {bans.map((b) => (
        <div
          key={b.userId}
          className="flex items-center gap-2 p-2 rounded-lg border border-border/60"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={b.image ?? undefined} />
            <AvatarFallback>{b.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">@{b.username}</p>
            <p className="text-[11px] text-muted-foreground">
              @{b.bannedBy} · {new Date(b.at).toLocaleDateString("ko-KR")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void unban(b.userId)}>
            해제
          </Button>
        </div>
      ))}
    </div>
  );
}
