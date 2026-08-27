"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const JitsiMeeting = dynamic(
  () => import("@jitsi/react-sdk").then((m) => m.JitsiMeeting),
  { ssr: false, loading: () => null }
);

export type CommunityJitsiCreds = {
  domain: string;
  roomName: string;
  displayName: string;
  config: {
    startWithAudioMuted: boolean;
    startWithVideoMuted: boolean;
    disableScreenSharing: boolean;
  };
};

const TOKEN_TIMEOUT_MS = 15_000;

export async function fetchCommunityJitsiRoom(
  channelId: string,
  signal?: AbortSignal
): Promise<CommunityJitsiCreds> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TOKEN_TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  try {
    const res = await fetch(
      `/api/jitsi/community-room?channelId=${encodeURIComponent(channelId)}`,
      { credentials: "include", cache: "no-store", signal: ctrl.signal }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.domain || !body.roomName) {
      throw new Error((body as { error?: string }).error ?? `입장 정보 실패 (${res.status})`);
    }
    return body as CommunityJitsiCreds;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("연결 시간이 초과됐습니다. 다시 참가해 주세요.");
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

export function CommunityJitsiRoom({
  channelId,
  channelName,
  muted,
  deafened,
  cameraOn,
  onConnected,
  onDisconnected,
  onError,
}: {
  channelId: string;
  channelName: string;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
}) {
  const [creds, setCreds] = useState<CommunityJitsiCreds | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchCommunityJitsiRoom(channelId)
      .then((data) => {
        if (!cancelled) {
          setCreds(data);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          onError?.(e instanceof Error ? e.message : "Jitsi 입장 실패");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, onError]);

  if (loading || !creds) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/40 bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Jitsi 방 연결 중…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-black">
      <JitsiMeeting
        domain={creds.domain}
        roomName={creds.roomName}
        configOverwrite={{
          subject: channelName,
          prejoinPageEnabled: false,
          startWithAudioMuted: muted || creds.config.startWithAudioMuted,
          startWithVideoMuted: !cameraOn || creds.config.startWithVideoMuted,
          disableModeratorIndicator: true,
          disableDeepLinking: true,
          enableClosePage: false,
          disableInviteFunctions: true,
          ...(creds.config.disableScreenSharing ? { disableScreensharing: true } : {}),
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          MOBILE_APP_PROMO: false,
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "fullscreen",
            "hangup",
            "settings",
            "tileview",
          ],
        }}
        userInfo={{ displayName: creds.displayName, email: `${creds.displayName.replace(/\s+/g, "").slice(0, 32)}@mocomo.local` }}
        onApiReady={(api) => {
          onConnected?.();
          if (deafened) {
            api.executeCommand("toggleAudio");
          }
        }}
        onReadyToClose={() => onDisconnected?.()}
        getIFrameRef={(iframe) => {
          if (iframe) {
            iframe.style.height = "100%";
            iframe.style.width = "100%";
            iframe.style.minHeight = "320px";
          }
        }}
      />
    </div>
  );
}
