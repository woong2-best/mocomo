"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveBroadcastMode, LiveStreamCategory, LiveVisibility, SupportTierLevel } from "@prisma/client";
import {
  joinLiveStreamWithPassword,
  enterLiveAsViewer,
  applyLiveCollabPassword,
  heartbeatLivePresence,
  endLiveStream,
  leaveLiveStream,
} from "@/actions/live-stream";
import { tierLabelKo } from "@/lib/live-viewer-access";
import { LiveStreamRoom } from "@/components/live/live-stream-room";
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
  broadcastMode,
  liveVisibility = "PUBLIC",
  minViewerTier,
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
  broadcastMode?: LiveBroadcastMode;
  liveVisibility?: LiveVisibility;
  minViewerTier?: SupportTierLevel | null;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [collabPassword, setCollabPassword] = useState("");
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [collabOk, setCollabOk] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const [showHostPassword, setShowHostPassword] = useState(!!storedPassword);
  const [recentTips, setRecentTips] = useState<LiveTipAlert[]>([]);

  const enterStudioAsHost = useCallback(async () => {
    setJoining(true);
    setJoinError("");
    const res = await joinLiveStreamWithPassword(channelId, "");
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
    <div className="space-y-4 relative">
      <LiveTipAlerts tips={recentTips} />
      {isHost && storedPassword && showHostPassword && (
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

      {!isHost && (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          {collabOk ? (
            <p className="text-sm text-green-700 font-medium">합방 승인됨 · 마이크/카메라로 함께 방송할 수 있습니다.</p>
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
