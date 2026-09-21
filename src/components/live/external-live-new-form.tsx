"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LiveStreamCategory } from "@prisma/client";
import { createExternalLiveStream } from "@/actions/live-external";
import { getLiveStudioSettings } from "@/actions/live-studio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { YoutubeEmbedGuide } from "@/components/live/youtube-embed-guide";
import { BROADCAST_PICK_CATEGORIES } from "@/lib/live-categories";
import { cn } from "@/lib/utils";

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  TWITCH: "Twitch",
};

type Account = {
  id: string;
  platform: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  profileImage: string | null;
};

type Props = {
  accounts: Account[];
};

export function ExternalLiveNewForm({ accounts }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<LiveStreamCategory>("JUST_CHATTING");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = accounts.find((a) => a.id === selectedAccountId);

  useEffect(() => {
    void getLiveStudioSettings()
      .then((s) => {
        if (s.defaultCategory && s.defaultCategory !== "VIRTUAL") {
          setCategory(s.defaultCategory);
        }
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await createExternalLiveStream({
        connectedAccountId: selectedAccountId,
        category,
        goLive: true,
      });
      if ("error" in result && result.error) {
        const suffix =
          "existingChannelId" in result && result.existingChannelId
            ? ` (이전 방송: /voice/${result.existingChannelId})`
            : "";
        setError(`${result.error}${suffix}`);
        return;
      }
      if ("channel" in result && result.channel) {
        router.push(`/voice/${result.channel.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">인증된 계정으로 방송 시작</CardTitle>
        <p className="text-sm text-muted-foreground">
          영상은 해당 플랫폼 플레이어로만 보여 줍니다. 채팅·후원은 MoCoMo에서 제공됩니다.
          제목·설명은 YouTube/Twitch에서 설정한 내용이 자동으로 반영됩니다.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {BROADCAST_PICK_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                    category === c.value
                      ? "border-folk-terracotta bg-folk-terracotta/15 text-folk-terracotta"
                      : "border-border/70 text-muted-foreground hover:border-folk-cobalt/40"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">스트리밍 계정</label>
            <div className="space-y-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                    selectedAccountId === acc.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{acc.channelName}</span>
                      <Badge variant="secondary">
                        {PLATFORM_LABELS[acc.platform] ?? acc.platform}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{acc.channelId}</span>
                  </div>
                  <a
                    href={acc.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <Link href="/settings/streaming-accounts" className="text-primary hover:underline">
                다른 계정 연결/관리
              </Link>
            </p>
          </div>

          {selected?.platform === "YOUTUBE" ? <YoutubeEmbedGuide variant="full" /> : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy || !selectedAccountId}>
            {busy ? "연결 중…" : "방송 연결하고 시작"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
