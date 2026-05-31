"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, MicOff, MonitorUp, Radio, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CloudflareWhipPublisher } from "@/lib/cloudflare-whip-publish";
import { startBrowserLiveBroadcast } from "@/actions/live-stream";

type IngestPayload = {
  ok?: boolean;
  ingestEngine?: string;
  whipPublishUrl?: string;
  hlsUrl?: string | null;
  error?: string;
  message?: string;
};

/** 브라우저 → Cloudflare WHIP 송출, 시청자는 CDN HLS (OBS·LiveKit 불필요) */
export function LiveBrowserStudio({
  channelId,
  onAirChange,
  initialOnAir = false,
}: {
  channelId: string;
  onAirChange?: (onAir: boolean) => void;
  initialOnAir?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const whipRef = useRef<CloudflareWhipPublisher | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loadError, setLoadError] = useState("");
  const [liveError, setLiveError] = useState("");
  const [onAir, setOnAir] = useState(initialOnAir);
  const [goingLive, setGoingLive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [whipUrl, setWhipUrl] = useState<string | null>(null);
  const [ingestEngine, setIngestEngine] = useState<string>("cloudflare");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onAirChange?.(onAir);
  }, [onAir, onAirChange]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/live/${channelId}/ingest`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as IngestPayload;
        if (!res.ok) {
          throw new Error(body.error ?? "방송 연결 정보를 불러오지 못했습니다.");
        }
        if (!cancelled) {
          if (body.ingestEngine !== "cloudflare" || !body.whipPublishUrl) {
            setLoadError(
              body.message ??
                "브라우저 방송은 Cloudflare Stream이 필요합니다. CLOUDFLARE_* 환경 변수를 확인하세요."
            );
            setIngestEngine(body.ingestEngine ?? "unknown");
            return;
          }
          setWhipUrl(body.whipPublishUrl);
          setIngestEngine("cloudflare");
          setLoadError("");
          setReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "연결 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const ensureLocalStream = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }
    return stream;
  }, []);

  useEffect(() => {
    if (!ready) return;
    void ensureLocalStream().catch((e) => {
      setLiveError(e instanceof Error ? e.message : "카메라·마이크 권한이 필요합니다.");
    });
    return () => {
      whipRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [ready, ensureLocalStream]);

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
    const stream = streamRef.current;
    if (!stream) return;
    if (!screenOn) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const videoTrack = display.getVideoTracks()[0];
        if (videoTrack) {
          const oldVideo = stream.getVideoTracks()[0];
          if (oldVideo) {
            stream.removeTrack(oldVideo);
            oldVideo.stop();
          }
          stream.addTrack(videoTrack);
          if (videoRef.current) videoRef.current.srcObject = stream;
          if (onAir && whipUrl) {
            whipRef.current?.stop();
            const pub = new CloudflareWhipPublisher();
            whipRef.current = pub;
            await pub.start(whipUrl, stream);
          }
        }
        setScreenOn(true);
        setCamOn(true);
      } catch {
        setLiveError("화면 공유가 취소되었습니다.");
      }
      return;
    }
    setScreenOn(false);
    await ensureLocalStream();
  }

  const handleGoLive = useCallback(async () => {
    if (!whipUrl) return;
    setGoingLive(true);
    setLiveError("");
    try {
      const stream = await ensureLocalStream();
      stream.getVideoTracks().forEach((t) => {
        t.enabled = true;
      });
      setCamOn(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      const pub = new CloudflareWhipPublisher();
      whipRef.current = pub;
      await pub.start(whipUrl, stream);
      const res = await startBrowserLiveBroadcast(channelId);
      if ("error" in res && res.error) {
        whipRef.current?.stop();
        setLiveError(res.error);
        return;
      }
      setOnAir(true);
      router.refresh();
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "방송 시작 실패");
      whipRef.current?.stop();
    } finally {
      setGoingLive(false);
    }
  }, [channelId, whipUrl, ensureLocalStream, router]);

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

  return (
    <div className="flex flex-col gap-3 h-full min-h-[min(50vh,400px)]">
      <div className="relative flex-1 min-h-[200px] rounded-xl overflow-hidden bg-black ring-1 ring-border/50">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
        {onAir && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold z-10 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE · Cloudflare
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => void toggleMic()}>
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {micOn ? "마이크" : "음소거"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => void toggleCam()}>
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          {camOn ? "카메라 끔" : "카메라"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => void toggleScreen()}>
          <MonitorUp className="h-4 w-4" />
          {screenOn ? "화면공유 끔" : "화면 공유"}
        </Button>
      </div>

      {liveError && <p className="text-xs text-destructive">{liveError}</p>}

      {!onAir ? (
        <Button
          type="button"
          className="rounded-xl gap-2 font-bold"
          disabled={goingLive}
          onClick={() => void handleGoLive()}
        >
          {goingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          방송 시작
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          방송 중입니다. 시청자는 같은 페이지에서 실시간(WHEP)으로 시청합니다. 종료는 상단 「방송 종료」.
        </p>
      )}

      {onAir && (
        <p className="text-[10px] text-muted-foreground px-1">
          위 웹캠이 시청자에게 전달됩니다. 검은 화면이면 「카메라」를 눌러 켜세요. 시청자 재생은 송출 연결 후 10~30초 걸릴 수 있습니다.
        </p>
      )}
    </div>
  );
}
