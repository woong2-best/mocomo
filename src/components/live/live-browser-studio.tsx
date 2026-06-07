"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, MonitorUp, Radio, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaceFilterStrip } from "@/components/media/face-filter-strip";
import { LiveHostPublishBlocked } from "@/components/live/live-host-publish-blocked";
import { useFaceFilterPipeline } from "@/hooks/use-face-filter-pipeline";
import { CloudflareWhipPublisher } from "@/lib/cloudflare-whip-publish";
import {
  getOrCreatePublisherTabId,
  livePublisherFetch,
} from "@/lib/live-publisher-tab";
import type { HostPublishState } from "@/lib/live-publisher-lock";
import { startBrowserLiveBroadcast } from "@/actions/live-stream";

type IngestPayload = {
  ok?: boolean;
  ingestEngine?: string;
  whipPublishUrl?: string;
  error?: string;
  message?: string;
  publishState?: string;
};

type StudioStatePayload = {
  publishState?: HostPublishState;
  canPublishOnThisTab?: boolean;
  isLive?: boolean;
};

/** 이 탭에서만 WHIP 송출 — 다른 기기·탭은 차단 */
export function LiveBrowserStudio({
  channelId,
  channelName,
  onAirChange,
  onEndStream,
  immersive = false,
}: {
  channelId: string;
  channelName: string;
  onAirChange?: (onAir: boolean) => void;
  onEndStream: () => void;
  /** 모바일 세로 풀스크린 — 기존 데스크탑 레이아웃 유지 */
  immersive?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reconnectAttemptRef = useRef(0);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const whipRef = useRef<CloudflareWhipPublisher | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  const {
    displayCanvas,
    filterId,
    setFilterId,
    attachRawStream,
    stop: stopFilterPipeline,
    getCompositeStream,
  } = useFaceFilterPipeline("natural");

  const [publishState, setPublishState] = useState<HostPublishState | "loading">("loading");
  const [loadError, setLoadError] = useState("");
  const [liveError, setLiveError] = useState("");
  const [whipConnected, setWhipConnected] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [whipUrl, setWhipUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const serverLive =
    publishState === "live_here" || publishState === "live_elsewhere";

  useEffect(() => {
    onAirChange?.(whipConnected && publishState === "live_here");
  }, [whipConnected, publishState, onAirChange]);

  const loadStudioState = useCallback(async () => {
    const res = await livePublisherFetch(`/api/live/${channelId}/studio-state`, {
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as StudioStatePayload;
    if (!res.ok) {
      throw new Error(
        typeof (body as { error?: string }).error === "string"
          ? (body as { error?: string }).error
          : "스튜디오 상태를 불러오지 못했습니다."
      );
    }
    const state = body.publishState ?? "idle";
    setPublishState(state);
    return state;
  }, [channelId]);

  const loadIngest = useCallback(async () => {
    const res = await livePublisherFetch(`/api/live/${channelId}/ingest`, {
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as IngestPayload;
    if (res.status === 409 && body.publishState === "live_elsewhere") {
      setPublishState("live_elsewhere");
      return null;
    }
    if (!res.ok) {
      throw new Error(body.error ?? "방송 연결 정보를 불러오지 못했습니다.");
    }
    if (body.ingestEngine !== "cloudflare" || !body.whipPublishUrl) {
      throw new Error(
        body.message ??
          "브라우저 방송은 Cloudflare Stream이 필요합니다. CLOUDFLARE_* 환경 변수를 확인하세요."
      );
    }
    setWhipUrl(body.whipPublishUrl);
    setLoadError("");
    return body.whipPublishUrl;
  }, [channelId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const state = await loadStudioState();
        if (cancelled) return;
        if (state === "live_elsewhere") return;
        await loadIngest();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          setPublishState("idle");
          setLoadError(e instanceof Error ? e.message : "연결 실패");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStudioState, loadIngest]);

  const ensureLocalStream = useCallback(async () => {
    if (!screenOn && streamRef.current && rawStreamRef.current) return streamRef.current;

    let raw = rawStreamRef.current;
    const needsNewRaw =
      !raw ||
      !raw.active ||
      raw.getVideoTracks().every((t) => t.readyState === "ended");

    if (needsNewRaw) {
      raw = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      rawStreamRef.current = raw;
    }

    if (!raw) throw new Error("카메라 스트림을 시작할 수 없습니다.");
    await attachRawStream(raw);
    const composite = getCompositeStream();
    streamRef.current = composite ?? raw;
    return streamRef.current;
  }, [attachRawStream, getCompositeStream, screenOn]);

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host || !displayCanvas || screenOn) return;
    host.innerHTML = "";
    displayCanvas.className = "w-full h-full object-contain";
    host.appendChild(displayCanvas);
    return () => {
      if (displayCanvas.parentElement === host) host.removeChild(displayCanvas);
    };
  }, [displayCanvas, screenOn]);

  useEffect(() => {
    if (!ready || (publishState !== "idle" && publishState !== "live_here")) return;
    void ensureLocalStream().catch((e) => {
      setLiveError(e instanceof Error ? e.message : "카메라·마이크 권한이 필요합니다.");
    });
  }, [ready, publishState, ensureLocalStream]);

  /** WHIP·카메라는 언마운트 시에만 정리 (publishState 변경 시 cleanup 하면 송출이 즉시 끊김) */
  useEffect(() => {
    return () => {
      whipRef.current?.stop();
      void stopFilterPipeline();
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
      streamRef.current = null;
    };
  }, [stopFilterPipeline]);

  const handleWhipDisconnect = useCallback(() => {
    setWhipConnected(false);
    setLiveError("송출 연결이 끊겼습니다. 다시 연결 중…");
  }, []);

  const connectWhip = useCallback(
    async (markLiveInDb: boolean) => {
      if (!whipUrl) return;
      const stream = await ensureLocalStream();
      stream.getVideoTracks().forEach((t) => {
        t.enabled = true;
      });
      setCamOn(true);
      if (!screenOn && videoRef.current) videoRef.current.srcObject = null;

      const pub = new CloudflareWhipPublisher();
      whipRef.current = pub;
      await pub.start(whipUrl, stream, { onDisconnect: handleWhipDisconnect });
      setWhipConnected(true);
      reconnectAttemptRef.current = 0;
      setLiveError("");

      if (markLiveInDb) {
        const tabId = getOrCreatePublisherTabId();
        const res = await startBrowserLiveBroadcast(channelId, tabId);
        if ("error" in res && res.error) {
          whipRef.current?.stop();
          setWhipConnected(false);
          throw new Error(res.error);
        }
        setPublishState("live_here");
      }
    },
    [channelId, whipUrl, ensureLocalStream, screenOn, handleWhipDisconnect]
  );

  const handleGoLive = useCallback(async () => {
    setGoingLive(true);
    setLiveError("");
    try {
      await connectWhip(true);
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "방송 시작 실패");
      whipRef.current?.stop();
      setWhipConnected(false);
    } finally {
      setGoingLive(false);
    }
  }, [connectWhip]);

  const handleReconnect = useCallback(async () => {
    setGoingLive(true);
    setLiveError("");
    try {
      whipRef.current?.stop();
      setWhipConnected(false);
      await loadIngest();
      await connectWhip(false);
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "송출 재연결 실패");
      whipRef.current?.stop();
      setWhipConnected(false);
    } finally {
      setGoingLive(false);
    }
  }, [connectWhip, loadIngest]);

  /** DB는 LIVE인데 WHIP만 끊긴 경우 자동 재연결 (새로고침·탭 복귀·네트워크 끊김) */
  useEffect(() => {
    if (!ready || publishState !== "live_here" || whipConnected || goingLive) return;
    if (reconnectAttemptRef.current >= 6) return;

    const delay = Math.min(1200 * (reconnectAttemptRef.current + 1), 8000);
    const timer = window.setTimeout(() => {
      reconnectAttemptRef.current += 1;
      void handleReconnect();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [ready, publishState, whipConnected, goingLive, handleReconnect]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (publishState !== "live_here" || whipConnected || goingLive) return;
      reconnectAttemptRef.current = 0;
      void handleReconnect();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [publishState, whipConnected, goingLive, handleReconnect]);

  async function toggleMic() {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicOn(next);
  }

  async function toggleCam() {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCamOn(next);
  }

  async function toggleScreen() {
    if (!whipUrl) return;
    if (!screenOn) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const videoTrack = display.getVideoTracks()[0];
        if (!videoTrack) return;

        await stopFilterPipeline();
        const audioTracks =
          rawStreamRef.current?.getAudioTracks() ??
          streamRef.current?.getAudioTracks().filter((t) => t.kind === "audio") ??
          [];
        const screenStream = new MediaStream([videoTrack, ...audioTracks]);
        streamRef.current = screenStream;

        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
          await videoRef.current.play().catch(() => undefined);
        }

        if (whipConnected) {
          whipRef.current?.stop();
          const pub = new CloudflareWhipPublisher();
          whipRef.current = pub;
          await pub.start(whipUrl, screenStream, { onDisconnect: handleWhipDisconnect });
        }
        setScreenOn(true);
        setCamOn(true);
      } catch {
        setLiveError("화면 공유가 취소되었습니다.");
      }
      return;
    }
    setScreenOn(false);
    streamRef.current = null;
    const stream = await ensureLocalStream();
    if (videoRef.current) videoRef.current.srcObject = null;
    if (whipConnected && stream) {
      whipRef.current?.stop();
      const pub = new CloudflareWhipPublisher();
      whipRef.current = pub;
      await pub.start(whipUrl, stream, { onDisconnect: handleWhipDisconnect });
    }
  }

  if (publishState === "loading") {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">스튜디오 준비 중…</span>
      </div>
    );
  }

  if (publishState === "live_elsewhere") {
    return (
      <LiveHostPublishBlocked channelName={channelName} onEndStream={onEndStream} />
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive space-y-2">
        <p>{loadError}</p>
        <p className="text-xs text-muted-foreground">
          Vercel: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN,
          NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_HOST
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Cloudflare 방송 준비 중…</span>
      </div>
    );
  }

  const needsReconnect = serverLive && !whipConnected;

  const rootClass = immersive
    ? "relative flex flex-col h-full min-h-[100dvh] w-full gap-0"
    : "flex flex-col gap-3 h-full min-h-[min(50vh,400px)]";
  const previewClass = immersive
    ? "relative flex-1 min-h-0 overflow-hidden bg-black"
    : "relative flex-1 min-h-[200px] rounded-xl overflow-hidden bg-black ring-1 ring-border/50";
  const controlsWrapClass = immersive
    ? "absolute bottom-0 left-0 right-0 z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+8.5rem)] pt-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2"
    : "contents";

  return (
    <div className={rootClass}>
      <div className={previewClass}>
        <div
          ref={previewHostRef}
          className={screenOn ? "hidden" : "absolute inset-0"}
        />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full ${immersive ? "object-cover" : "object-contain"} ${screenOn ? "block" : "hidden"}`}
        />
        {whipConnected && !immersive && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-folk-terracotta text-white text-[10px] font-bold z-10 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <div className={controlsWrapClass}>
      {!screenOn && (
        <FaceFilterStrip
          value={filterId}
          onChange={setFilterId}
          disabled={goingLive && whipConnected}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1"
          disabled={!whipConnected && !needsReconnect && publishState === "idle"}
          onClick={() => void toggleMic()}
        >
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {micOn ? "마이크" : "음소거"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1"
          onClick={() => void toggleCam()}
        >
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          {camOn ? "카메라 끔" : "카메라"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1"
          onClick={() => void toggleScreen()}
        >
          <MonitorUp className="h-4 w-4" />
          {screenOn ? "화면공유 끔" : "화면 공유"}
        </Button>
      </div>

      {liveError && <p className="text-xs text-destructive">{liveError}</p>}

      {publishState === "idle" && (
        <Button
          type="button"
          className="rounded-xl gap-2 font-bold"
          disabled={goingLive}
          onClick={() => void handleGoLive()}
        >
          {goingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          방송 시작
        </Button>
      )}

      {needsReconnect && (
        <>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {goingLive
              ? "송출을 다시 연결하는 중입니다…"
              : "방송은 이 기기에 등록되어 있으나 송출 연결이 끊겼습니다. 자동 재연결에 실패하면 「송출 재연결」을 눌러 주세요."}
          </p>
          <Button
            type="button"
            className="rounded-xl gap-2 font-bold"
            disabled={goingLive}
            onClick={() => void handleReconnect()}
          >
            {goingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            송출 재연결
          </Button>
        </>
      )}

      {whipConnected && !immersive && (
        <p className="text-xs text-muted-foreground">
          이 기기·브라우저에서만 방송 중입니다. 종료는 상단 「방송 종료」.
        </p>
      )}
      </div>
    </div>
  );
}
