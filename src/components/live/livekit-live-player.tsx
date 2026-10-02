"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2, Radio } from "lucide-react";
import { livePublisherIdentities } from "@/lib/live-participant";
import { fetchLivekitCredentials } from "@/lib/livekit-token-fetch";
import "@livekit/components-styles";
function PublisherVideo({
  channelId,
  hostUserId,
}: {
  channelId: string;
  hostUserId?: string;
}) {
  const { t } = useLocale();
  const tracks = useTracks(
    [
      Track.Source.Camera,
      Track.Source.ScreenShare,
      Track.Source.Unknown,
    ],
    { onlySubscribed: true }
  );

  const identities = hostUserId
    ? livePublisherIdentities(channelId, hostUserId)
    : [];

  const publisher = tracks.find(
    (t) =>
      identities.includes(t.participant.identity) &&
      (t.source === Track.Source.Camera ||
        t.source === Track.Source.ScreenShare ||
        t.source === Track.Source.Unknown) &&
      t.publication
  );

  if (!publisher) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 bg-black/70">
        <Loader2 className="h-10 w-10 animate-spin" />
        <Radio className="h-8 w-8 text-folk-terracotta" />
        <p className="text-sm text-center px-4 max-w-sm">
          {t("live.s1osl8uk")}
        </p>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={publisher}
      className="w-full h-full object-contain bg-black"
    />
  );
}

/** LiveKit WebRTC 시청 — 브라우저 호스트 또는 OBS */
export function LivekitLivePlayer({
  channelId,
  hostUserId: hostUserIdProp,
}: {
  channelId: string;
  hostUserId?: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [hostUserId, setHostUserId] = useState<string | undefined>(hostUserIdProp);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const body = await fetchLivekitCredentials(channelId);
        if (!cancelled) {
          setToken(body.token);
          setServerUrl(body.serverUrl);
          setHostUserId(hostUserIdProp ?? body.hostUserId);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("live.seed06c"));
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [channelId, hostUserIdProp]);

  if (error) {
    return (
      <div className="aspect-video rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center p-6 text-sm text-destructive text-center">
        {error}
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">{t("live.sm91x99")}</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden ring-1 ring-border/40">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video
        audio
        className="h-full w-full"
      >
        <RoomAudioRenderer />
        <PublisherVideo channelId={channelId} hostUserId={hostUserId} />
      </LiveKitRoom>
      <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold z-10 pointer-events-none">
        {t("live.sthqq4")}
      </span>
    </div>
  );
}
