"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createExternalLiveStream } from "@/actions/live-external";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  TWITCH: "Twitch",
  CHZZK: "치지직",
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
  const [name, setName] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [overlayHint, setOverlayHint] = useState<string | null>(null);

  const selected = accounts.find((a) => a.id === selectedAccountId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await createExternalLiveStream({
        name,
        connectedAccountId: selectedAccountId,
        goLive: true,
      });
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("channel" in result && result.channel) {
        const chat = result.overlay?.chatUrl;
        if (chat) {
          setOverlayHint(
            `OBS 브라우저 소스: ${typeof window !== "undefined" ? window.location.origin : ""}${chat}`
          );
        }
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
          영상은 해당 플랫폼 플레이어로만 보여 줍니다. 채팅·후원은 MoCoMo에서 제공되며, 후원은
          인증된 본인 계정의 방송에서만 받을 수 있습니다.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">방송 제목</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selected ? `${selected.channelName} 라이브` : "오늘의 라이브"}
              maxLength={120}
            />
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {overlayHint ? (
            <p className="break-all text-xs text-muted-foreground">{overlayHint}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy || !selectedAccountId}>
            {busy ? "연결 중…" : "방송 연결하고 시작"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
