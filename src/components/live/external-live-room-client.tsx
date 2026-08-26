"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  enterLiveAsHost,
  enterLiveAsViewer,
  endLiveStream,
  leaveLiveStream,
} from "@/actions/live-stream";
import { LiveHostPresenceSync } from "@/components/live/live-host-presence-sync";
import { ExternalLiveRoom } from "@/components/live/external-live-room";
import { Button } from "@/components/ui/button";
import { Loader2, Square } from "lucide-react";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";

type Props = {
  channelId: string;
  title: string;
  platformTitle?: string | null;
  platformDescription?: string | null;
  provider: LiveExternalProvider;
  embedUrl: string | null;
  watchUrl: string;
  embedSupported: boolean;
  category?: LiveStreamCategory;
  tags?: string[];
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  tipRanking?: { username: string; amount: number }[];
  host: {
    id: string;
    username: string;
    image: string | null;
    displayName?: string | null;
    tier?: SupportTierLevel;
    totalSupport?: number;
  };
  currentUserId: string;
  isHost: boolean;
  paymentsEnabled: boolean;
  hostFollowing?: boolean;
  viewerSupportTier?: SupportTierLevel | null;
  viewerSupportTotal?: number;
};

const POLL_MS = 5_000;

function shouldLeaveAfterStatus(data: {
  mocomoLive?: boolean;
  ended?: boolean;
  platformOnAir?: boolean | null;
}): boolean {
  if (data.ended) return true;
  if (data.mocomoLive === false) return true;
  if (data.platformOnAir === false) return true;
  return false;
}

/**
 * Client shell for external live rooms — presence, platform sync, auto-leave on end.
 */
export function ExternalLiveRoomClient(props: Props) {
  const { channelId, isHost } = props;
  const router = useRouter();
  const joinedRef = useRef(false);
  const endingRef = useRef(false);
  const endedRef = useRef(false);

  const leaveRoom = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    router.replace("/live");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function join() {
      const res = isHost
        ? await enterLiveAsHost(channelId)
        : await enterLiveAsViewer(channelId);
      if (!cancelled && !("error" in res && res.error)) {
        joinedRef.current = true;
      }
    }

    void join();
    return () => {
      cancelled = true;
      if (joinedRef.current && !isHost && !endedRef.current) {
        void leaveLiveStream(channelId);
      }
    };
  }, [channelId, isHost]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (endedRef.current || endingRef.current) return;
      try {
        const res = await fetch(`/api/live/${channelId}/external-status`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          mocomoLive?: boolean;
          ended?: boolean;
          platformOnAir?: boolean | null;
        };
        if (shouldLeaveAfterStatus(data)) {
          leaveRoom();
        }
      } catch {
        /* ignore transient network errors */
      }
    }

    void poll();
    const id = setInterval(() => {
      if (!cancelled) void poll();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [channelId, leaveRoom]);

  function handleEndStream() {
    if (endingRef.current) return;
    endingRef.current = true;
    endedRef.current = true;
    router.replace("/live");
    void endLiveStream(channelId);
  }

  return (
    <>
      <LiveHostPresenceSync channelId={channelId} enabled={isHost} />
      {isHost ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">
            YouTube·Twitch·치지직에서 방송을 종료하면 MoCoMo 방송도 자동으로 종료됩니다.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={handleEndStream}
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            방송 종료
          </Button>
        </div>
      ) : null}
      <ExternalLiveRoom {...props} onPlatformEnded={leaveRoom} />
    </>
  );
}

export function ExternalLiveRoomJoining() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
