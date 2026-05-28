"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import {
  joinLiveStreamWithPassword,
  heartbeatLivePresence,
  endLiveStream,
  leaveLiveStream,
} from "@/actions/live-stream";
import { LiveStreamRoom } from "@/components/live/live-stream-room";
import { LiveTipAlerts, type LiveTipAlert } from "@/components/live/live-tip-alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Loader2 } from "lucide-react";

export function LiveRoomClient({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostTier,
  hostTotalSupport,
  isHost,
  storedPassword,
  category,
  donationGoalKrw,
  tipTotalKrw,
  tipRanking,
  slowModeSeconds,
  chatBannedWords,
  paymentsEnabled,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  hostTier?: SupportTierLevel;
  hostTotalSupport?: number;
  isHost: boolean;
  storedPassword?: string | null;
  category?: LiveStreamCategory;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  tipRanking?: { username: string; amount: number }[];
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  paymentsEnabled?: boolean;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(isHost);
  const [password, setPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const [showHostPassword, setShowHostPassword] = useState(!!storedPassword);
  const [recentTips, setRecentTips] = useState<LiveTipAlert[]>([]);

  const enterAsHost = useCallback(async () => {
    setJoining(true);
    const res = await joinLiveStreamWithPassword(channelId, "");
    setJoining(false);
    if ("error" in res && res.error) {
      setJoinError(res.error);
      return;
    }
    setJoined(true);
  }, [channelId]);

  useEffect(() => {
    if (isHost && !joined) void enterAsHost();
  }, [isHost, joined, enterAsHost]);

  useEffect(() => {
    if (!joined) return;
    const tick = async () => {
      const res = await heartbeatLivePresence(channelId);
      if ("viewerCount" in res && typeof res.viewerCount === "number") {
        setViewerCount((prev) => (prev === res.viewerCount ? prev : res.viewerCount));
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [joined, channelId]);

  useEffect(() => {
    if (!joined) return;
    return () => {
      void leaveLiveStream(channelId);
    };
  }, [joined, channelId]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    setJoining(true);
    const res = await joinLiveStreamWithPassword(channelId, password);
    setJoining(false);
    if ("error" in res && res.error) {
      setJoinError(res.error);
      return;
    }
    setJoined(true);
  }

  async function handleEndStream() {
    await endLiveStream(channelId);
    router.push("/live");
  }

  if (!joined) {
    return (
      <div className="max-w-md mx-auto live-hero !p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-red-500/15 flex items-center justify-center">
            <KeyRound className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold">합방 비밀번호</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{channelName}</span>
            <br />
            호스트가 공유한 6자리 비밀번호를 입력해야 입장할 수 있습니다.
          </p>
        </div>
        <form onSubmit={handleJoin} className="space-y-3">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value.toUpperCase())}
            placeholder="예: A3K9P2"
            className="rounded-xl text-center text-lg tracking-[0.3em] font-mono uppercase h-12"
            maxLength={6}
            autoComplete="off"
            required
          />
          {joinError && <p className="text-sm text-destructive text-center">{joinError}</p>}
          <Button type="submit" className="w-full rounded-xl h-11" disabled={joining}>
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "입장하기"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <LiveTipAlerts tips={recentTips} />
      {isHost && storedPassword && showHostPassword && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">합방 비밀번호 (시청자에게 공유)</p>
            <p className="text-2xl font-mono font-bold tracking-widest">{storedPassword}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowHostPassword(false)}>
            숨기기
          </Button>
        </div>
      )}

      <LiveStreamRoom
        channelId={channelId}
        channelName={channelName}
        hostUserId={hostUserId}
        hostUsername={hostUsername}
        hostDisplayName={hostDisplayName}
        hostTier={hostTier}
        hostTotalSupport={hostTotalSupport}
        isHost={isHost}
        viewerCount={viewerCount}
        onViewerCount={setViewerCount}
        onEndStream={handleEndStream}
        category={category}
        donationGoalKrw={donationGoalKrw}
        tipTotalKrw={tipTotalKrw}
        tipRanking={tipRanking}
        slowModeSeconds={slowModeSeconds}
        chatBannedWords={chatBannedWords}
        paymentsEnabled={paymentsEnabled}
        onRecentTips={setRecentTips}
      />
    </div>
  );
}
