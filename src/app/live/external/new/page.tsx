"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createExternalLiveStream } from "@/actions/live-external";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { ChevronLeft } from "lucide-react";

const PROVIDERS: { id: LiveExternalProvider | undefined; label: string }[] = [
  { id: undefined, label: "자동 감지" },
  { id: "YOUTUBE", label: "YouTube" },
  { id: "TWITCH", label: "Twitch" },
  { id: "CHZZK", label: "치지직" },
];

export default function ExternalLiveNewPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [providerHint, setProviderHint] = useState<LiveExternalProvider | undefined>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [overlayHint, setOverlayHint] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await createExternalLiveStream({
        name,
        sourceUrl,
        providerHint,
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
    <AppPageChrome maxWidth="lg" spacing="sm">
      <NativePageTitle>외부 방송 연결</NativePageTitle>
      <div className="mb-3">
        <Link
          href="/live"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          라이브
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">유튜브 · 트위치 · 치지직 연결</CardTitle>
          <p className="text-sm text-muted-foreground">
            영상은 해당 플랫폼 플레이어로만 보여 줍니다. 채팅·후원은 MoCoMo에서 따로 제공되며
            플레이어 위에 UI를 겹치지 않습니다. 제휴 서비스가 아닙니다.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">방송 제목</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="오늘의 라이브"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">플랫폼</label>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    size="sm"
                    variant={providerHint === p.id ? "default" : "outline"}
                    onClick={() => setProviderHint(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">라이브 URL 또는 ID</label>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… / twitch.tv/… / chzzk.naver.com/…"
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {overlayHint ? (
              <p className="break-all text-xs text-muted-foreground">{overlayHint}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy || !sourceUrl.trim()}>
              {busy ? "연결 중…" : "방송 연결하고 시작"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppPageChrome>
  );
}
