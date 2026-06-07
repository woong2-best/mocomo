"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveBroadcastMode, LiveStreamCategory, LiveVisibility, SupportTierLevel } from "@prisma/client";
import {
  enterLiveAsHost,
  enterLiveAsViewer,
  applyLiveCollabPassword,
  endLiveStream,
  leaveLiveStream,
} from "@/actions/live-stream";
import { tierLabelKo } from "@/lib/live-viewer-access";
import { LiveHostStudioShell } from "@/components/live/live-host-studio-shell";
import { LiveViewerShell } from "@/components/live/live-viewer-shell";
import { useLiveMobilePortrait } from "@/hooks/use-live-mobile-portrait";
import { LiveStudioErrorBoundary } from "@/components/live/live-studio-error-boundary";
import { LiveStudioStatsSync } from "@/components/live/live-studio-stats-sync";
import { LiveTipAlerts, type LiveTipAlert } from "@/components/live/live-tip-alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Loader2, Users } from "lucide-react";

export function LiveRoomClient({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostImage,
  hostTier,
  hostTotalSupport,
  isHost,
  storedPassword,
  category,
  donationGoalKrw,
  tipTotalKrw: initialTipTotalKrw,
  tipRanking: initialTipRanking,
  slowModeSeconds,
  chatBannedWords,
  paymentsEnabled,
  broadcastMode,
  liveVisibility = "PUBLIC",
  minViewerTier,
  hostFollowing,
  isLiveOnAir = false,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  hostImage?: string | null;
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
  broadcastMode?: LiveBroadcastMode;
  liveVisibility?: LiveVisibility;
  minViewerTier?: SupportTierLevel | null;
  hostFollowing?: boolean;
  isLiveOnAir?: boolean;
}) {
  const router = useRouter();
  const mobilePortrait = useLiveMobilePortrait();
  const [joined, setJoined] = useState(false);
  const [collabPassword, setCollabPassword] = useState("");
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [collabOk, setCollabOk] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const [showHostPassword, setShowHostPassword] = useState(false);
  const [recentTips, setRecentTips] = useState<LiveTipAlert[]>([]);
  const [tipTotalKrw, setTipTotalKrw] = useState(initialTipTotalKrw ?? 0);
  const [tipRanking, setTipRanking] = useState(initialTipRanking ?? []);

  const handleStats = useCallback(
    (data: {
      tipTotalKrw: number;
      tipRanking: { username: string; amount: number }[];
      recentTips: LiveTipAlert[];
    }) => {
      setTipTotalKrw(data.tipTotalKrw);
      setTipRanking(data.tipRanking);
      if (data.recentTips.length > 0) {
        setRecentTips((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          const fresh = data.recentTips.filter((t) => !ids.has(t.id));
          return fresh.length ? [...fresh, ...prev].slice(0, 5) : prev;
        });
      }
    },
    []
  );

  const enterStudioAsHost = useCallback(async () => {
    setJoining(true);
    setJoinError("");
    const res = await enterLiveAsHost(channelId);
    setJoining(false);
    if ("error" in res && res.error) {
      setJoinError(res.error);
      return;
    }
    setJoined(true);
  }, [channelId]);

  const enterStudioAsViewer = useCallback(async () => {
    setJoining(true);
    setJoinError("");
    const res = await enterLiveAsViewer(channelId);
    setJoining(false);
    if ("error" in res && res.error) {
      setJoinError(res.error);
      return;
    }
    setJoined(true);
  }, [channelId]);

  useEffect(() => {
    if (joined) return;
    if (isHost) void enterStudioAsHost();
    else void enterStudioAsViewer();
  }, [isHost, joined, enterStudioAsHost, enterStudioAsViewer]);

  useEffect(() => {
    if (!joined || isHost) return;
    return () => {
      void leaveLiveStream(channelId);
    };
  }, [joined, channelId, isHost]);

  async function handleCollabApply(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    setJoining(true);
    const res = await applyLiveCollabPassword(channelId, collabPassword);
    setJoining(false);
    if ("error" in res && res.error) {
      setJoinError(res.error);
      return;
    }
    setCollabOk(true);
    setShowCollabForm(false);
  }

  async function handleEndStream() {
    await endLiveStream(channelId);
    router.push("/live");
  }

  const studioProps = {
    channelId,
    channelName,
    hostUserId,
    hostUsername,
    hostDisplayName,
    hostImage,
    hostTier,
    hostTotalSupport,
    viewerCount,
    onViewerCount: setViewerCount,
    category,
    donationGoalKrw,
    tipTotalKrw,
    tipRanking,
    slowModeSeconds,
    chatBannedWords,
    paymentsEnabled,
    broadcastMode,
    hostFollowing,
  };

  if (!joined) {
    return (
      <div className="max-w-md mx-auto live-hero !p-8 space-y-4 shadow-xl text-center">
        {joining ? (
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        ) : (
          <>
            <p className="text-sm text-destructive">{joinError || "방송에 연결하지 못했습니다."}</p>
            {liveVisibility === "PRIVATE" && minViewerTier && (
              <p className="text-xs text-muted-foreground">
                비공개 방송 · 필요 등급: {tierLabelKo(minViewerTier)} 이상 (이 스트리머에게 후원 누적)
              </p>
            )}
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => (isHost ? void enterStudioAsHost() : void enterStudioAsViewer())}
            >
              다시 시도
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={isHost ? "relative" : "space-y-4 relative"}>
      <LiveStudioStatsSync channelId={channelId} onStats={handleStats} />
      {!mobilePortrait && !isHost && <LiveTipAlerts tips={recentTips} />}
      {!mobilePortrait && isHost && storedPassword && showHostPassword && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              합방 신청용 비밀번호 (공동 방송 희망자에게만 공유)
            </p>
            <p className="text-2xl font-mono font-bold tracking-widest">{storedPassword}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              일반 시청자는 비밀번호 없이 시청할 수 있습니다.
              {liveVisibility === "PRIVATE" && minViewerTier
                ? ` · 비공개 방송은 ${tierLabelKo(minViewerTier)} 이상 후원자만 시청 가능`
                : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowHostPassword(false)}>
            숨기기
          </Button>
        </div>
      )}

      {!mobilePortrait && !isHost && (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          {collabOk ? (
            <p className="text-sm text-green-700 font-medium">합방 승인됨 · 공동 방송 권한이 부여되었습니다.</p>
          ) : showCollabForm ? (
            <form onSubmit={handleCollabApply} className="flex flex-wrap gap-2 items-center w-full">
              <Input
                value={collabPassword}
                onChange={(e) => setCollabPassword(e.target.value.toUpperCase())}
                placeholder="합방 6자리"
                className="max-w-[140px] font-mono tracking-widest uppercase h-9"
                maxLength={6}
              />
              <Button type="submit" size="sm" className="rounded-lg" disabled={joining}>
                신청
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCollabForm(false)}>
                취소
              </Button>
              {joinError && <p className="text-xs text-destructive w-full">{joinError}</p>}
            </form>
          ) : (
            <>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                시청 중 · 합방을 원하면 비밀번호를 입력하세요
              </p>
              <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1" onClick={() => setShowCollabForm(true)}>
                <KeyRound className="h-3.5 w-3.5" />
                합방 신청
              </Button>
            </>
          )}
        </div>
      )}

      <LiveStudioErrorBoundary channelId={channelId} onEndStream={isHost ? handleEndStream : undefined}>
        {isHost ? (
          <LiveHostStudioShell {...studioProps} onEndStream={handleEndStream} />
        ) : (
          <LiveViewerShell {...studioProps} />
        )}
      </LiveStudioErrorBoundary>
    </div>
  );
}
