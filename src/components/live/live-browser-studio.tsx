"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, MessageSquare, Mic, MicOff, MonitorUp, Radio, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaceFilterStrip } from "@/components/media/face-filter-strip";
import { LiveHostCollabPasswordStrip } from "@/components/live/live-host-collab-password-strip";
import { LiveHostPublishBlocked } from "@/components/live/live-host-publish-blocked";
import { LiveHostCollabPreview } from "@/components/live/live-collab-publish-studio";
import { LiveOverlayLayer } from "@/components/live/overlays/live-overlay-layer";
import { LiveOverlayToolbar } from "@/components/live/overlays/live-overlay-toolbar";
import { LiveGamesHubLink } from "@/components/live/overlays/live-games-hub-link";
import { useLiveOverlayContextOptional } from "@/components/live/overlays/live-overlay-context";
import { useFaceFilterPipeline } from "@/hooks/use-face-filter-pipeline";
import { CloudflareWhipPublisher } from "@/lib/cloudflare-whip-publish";
import {
  getOrCreatePublisherTabId,
  livePublisherFetch,
} from "@/lib/live-publisher-tab";
import type { HostPublishState } from "@/lib/live-publisher-lock";
import { startBrowserLiveBroadcast } from "@/actions/live-stream";
import {
  LiveAvatarPublishLayer,
  LIVE_AVATAR_PREVIEW_READY_EVENT,
  type LiveAvatarBackground,
  type LiveAvatarLayout,
  type LiveAvatarPublishHandle,
} from "@/components/live/live-avatar-publish";
import { Live2dLibraryPanel, useLive2dLibraryActiveId } from "@/components/live/live-2d-library-panel";
import { getActiveLibraryCharacterId, hasLibraryCharacters } from "@/lib/avatar-2d/library";
import { setPhotoAvatarRenderMode } from "@/lib/photo-avatar/photo-avatar-storage";
import { LiveScreenShareCompositor } from "@/lib/live/live-screen-share-compositor";
import { LiveVideoChatOverlay } from "@/components/live/live-video-chat-overlay";
import { useLiveChatOverlay } from "@/hooks/use-live-chat-overlay";

const VTUBER_STORAGE_KEY = "mocomo_live_vtuber";
const VTUBER_LAYOUT_KEY = "mocomo_live_vtuber_layout";
const VTUBER_BG_KEY = "mocomo_live_vtuber_bg";

function readVtuberBackground(): "gradient" | "chroma" {
  if (typeof window === "undefined") return "gradient";
  return sessionStorage.getItem(VTUBER_BG_KEY) === "chroma" ? "chroma" : "gradient";
}

function readVtuberEnabled() {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(VTUBER_STORAGE_KEY) !== "1") return false;
  return hasLibraryCharacters() && !!getActiveLibraryCharacterId();
}

function readVtuberLayout(): LiveAvatarLayout {
  if (typeof window === "undefined") return "avatar";
  return sessionStorage.getItem(VTUBER_LAYOUT_KEY) === "camera-bg" ? "camera-bg" : "avatar";
}

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
  splitCollab,
  collabPassword,
}: {
  channelId: string;
  channelName: string;
  onAirChange?: (onAir: boolean) => void;
  onEndStream: () => void;
  /** 모바일 세로 풀스크린 — 기존 데스크탑 레이아웃 유지 */
  immersive?: boolean;
  /** 분할 합방 — 호스트 미리보기 좌우 분할 */
  splitCollab?: { coHostUserId: string; coHostLabel?: string };
  /** 합방 6자리 (방송 생성 시 sessionStorage) */
  collabPassword?: string | null;
}) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const reconnectAttemptRef = useRef(0);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const avatarPublishRef = useRef<LiveAvatarPublishHandle>(null);
  const whipRef = useRef<CloudflareWhipPublisher | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const screenCompositorRef = useRef<LiveScreenShareCompositor | null>(null);
  const screenDisplayRef = useRef<MediaStream | null>(null);

  const { data: session } = useSession();
  const { chatOverlayEnabled, setChatOverlayEnabled } = useLiveChatOverlay(
    channelId,
    session?.user?.id,
    true
  );

  const {
    displayCanvas,
    filterId,
    setFilterId,
    attachRawStream,
    stop: stopFilterPipeline,
    getCompositeStream,
    waitForBroadcastReady,
    active: filterActive,
    previewReady: filterPreviewReady,
    isPipelineRunning,
    getCanvas,
    landmarkerState,
    faceTrackingNeeded,
    faceTrackingReady,
  } = useFaceFilterPipeline("natural");

  const overlayCtx = useLiveOverlayContextOptional();

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
  const [vtuberMode, setVtuberMode] = useState(() => readVtuberEnabled());
  const [avatarLayout, setAvatarLayout] = useState<LiveAvatarLayout>(() => readVtuberLayout());
  const [avatarBackground, setAvatarBackground] = useState<LiveAvatarBackground>(() => readVtuberBackground());
  const equipped2dId = useLive2dLibraryActiveId();
  const [previewCanvasMounted, setPreviewCanvasMounted] = useState(false);
  const [previewLoadTimedOut, setPreviewLoadTimedOut] = useState(false);

  const serverLive =
    publishState === "live_here" || publishState === "live_elsewhere";

  useEffect(() => {
    onAirChange?.(whipConnected && publishState === "live_here");
  }, [whipConnected, publishState, onAirChange]);

  useEffect(() => {
    if (!vtuberMode) {
      setPreviewCanvasMounted(false);
      setPreviewLoadTimedOut(false);
      return;
    }
    if (!hasLibraryCharacters() || !getActiveLibraryCharacterId()) {
      setVtuberMode(false);
      sessionStorage.setItem(VTUBER_STORAGE_KEY, "0");
    }
  }, [vtuberMode]);

  useEffect(() => {
    if (!vtuberMode || !ready) return;
    avatarPublishRef.current?.setBackground(avatarBackground);
  }, [avatarBackground, vtuberMode, ready]);

  const loadStudioState = useCallback(async () => {
    const res = await livePublisherFetch(`/api/live/${channelId}/studio-state`, {
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as StudioStatePayload;
    if (!res.ok) {
      throw new Error(
        typeof (body as { error?: string }).error === "string"
          ? (body as { error?: string }).error
          : t("live.s1n6isc3")
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
      throw new Error(body.error ?? t("live.s1co8u3z"));
    }
    if (body.ingestEngine !== "cloudflare" || !body.whipPublishUrl) {
      throw new Error(
        body.message ??
          t("live.cloudflare_stream_cloudflare")
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
          const msg = e instanceof Error ? e.message : t("live.seed06c");
          setLoadError(
            msg === "Failed to fetch"
              ? t("live.sr2ybql")
              : msg
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStudioState, loadIngest]);

  const stopScreenShare = useCallback(async () => {
    screenCompositorRef.current?.stop();
    screenDisplayRef.current?.getTracks().forEach((t) => t.stop());
    screenDisplayRef.current = null;
    avatarPublishRef.current?.setScreenOverlayMode(false);
    setScreenOn(false);
    streamRef.current = null;
  }, []);

  const buildScreenShareStream = useCallback(async (display: MediaStream) => {
    if (!rawStreamRef.current?.active) {
      const mobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      rawStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: mobile ? 960 : 1280 },
          height: { ideal: mobile ? 540 : 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }

    let compositor = screenCompositorRef.current;
    if (!compositor) {
      compositor = new LiveScreenShareCompositor();
      screenCompositorRef.current = compositor;
    }

    let avatarCanvas: HTMLCanvasElement | null = null;
    if (vtuberMode && avatarPublishRef.current) {
      avatarPublishRef.current.setScreenOverlayMode(true);
      await avatarPublishRef.current.waitForReady();
      await avatarPublishRef.current.attachCameraStream(rawStreamRef.current);
      avatarCanvas = avatarPublishRef.current.getAvatarCanvas();
    }

    compositor.start(display, avatarCanvas ? null : rawStreamRef.current, {
      avatarCanvas,
    });
    screenDisplayRef.current = display;

    const video = compositor.getStream();
    const audio = rawStreamRef.current?.getAudioTracks() ?? [];
    const out = new MediaStream([...(video?.getVideoTracks() ?? []), ...audio]);
    streamRef.current = out;
    return out;
  }, [vtuberMode]);

  const bindCameraFallbackPreview = useCallback((raw: MediaStream | null) => {
    const video = videoRef.current;
    if (!video) return;
    if (!raw) {
      video.srcObject = null;
      return;
    }
    if (video.srcObject !== raw) {
      video.srcObject = raw;
    }
    void video.play().catch(() => undefined);
  }, []);

  const ensureLocalStream = useCallback(
    async (opts?: { vtuber?: boolean; layout?: LiveAvatarLayout }) => {
      const useVtuber = opts?.vtuber ?? vtuberMode;
      const layout = opts?.layout ?? avatarLayout;

      if (screenOn && screenCompositorRef.current?.getStream()) {
        const video = screenCompositorRef.current.getStream()!;
        const audio = rawStreamRef.current?.getAudioTracks() ?? [];
        const out = new MediaStream([...video.getVideoTracks(), ...audio]);
        streamRef.current = out;
        return out;
      }

      let raw = rawStreamRef.current;
      const videoLive = !!raw?.getVideoTracks().some((t) => t.readyState === "live");
      const pipelineOk = !useVtuber && isPipelineRunning() && videoLive;
      const vtuberOk =
        useVtuber && videoLive && !!avatarPublishRef.current?.getPublishStream() && !!streamRef.current;

      if (!screenOn && streamRef.current && raw && (pipelineOk || vtuberOk)) {
        if (!useVtuber) bindCameraFallbackPreview(raw);
        return streamRef.current;
      }

      const needsNewRaw =
        !raw ||
        !raw.active ||
        raw.getVideoTracks().every((t) => t.readyState === "ended");

      if (needsNewRaw) {
        const mobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        raw = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: useVtuber ? (mobile ? 1280 : 1920) : mobile ? 960 : 1280 },
            height: { ideal: useVtuber ? (mobile ? 720 : 1080) : mobile ? 540 : 720 },
            frameRate: { ideal: mobile ? 24 : 30, max: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        rawStreamRef.current = raw;
      }

      if (!raw) throw new Error(t("live.s7vk3za"));

      if (useVtuber && !screenOn) {
        bindCameraFallbackPreview(null);
        let avatar = avatarPublishRef.current;
        const waitStart = performance.now();
        while (!avatar && performance.now() - waitStart < 8000) {
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          avatar = avatarPublishRef.current;
        }
        if (!avatar) throw new Error(t("live.vtuber"));
        avatar.setLayout(layout);
        await avatar.attachCameraStream(raw);
        await avatar.waitForReady();
        const pub = avatar.getPublishStream();
        if (!pub) throw new Error(t("live.vtuber_2"));
        streamRef.current = pub;
        return pub;
      }

      // 필터 캔버스가 늦게 붙어도 바로 카메라가 보이도록 raw <video> 폴백을 먼저 연결
      bindCameraFallbackPreview(raw);
      await attachRawStream(raw, { mirrored: true });
      await waitForBroadcastReady().catch(() => undefined);
      const composite = getCompositeStream();
      streamRef.current = composite ?? raw;
      return streamRef.current;
    },
    [
      attachRawStream,
      bindCameraFallbackPreview,
      getCompositeStream,
      isPipelineRunning,
      waitForBroadcastReady,
      screenOn,
      vtuberMode,
      avatarLayout,
    ]
  );

  useEffect(() => {
    if (screenOn || !filterActive || vtuberMode) return;
    const composite = getCompositeStream();
    if (composite) streamRef.current = composite;
  }, [filterId, screenOn, filterActive, getCompositeStream, vtuberMode]);

  const mountPreviewCanvas = useCallback(
    (host: HTMLDivElement) => {
      host.replaceChildren();
      if (screenOn) {
        const canvas = screenCompositorRef.current?.canvas;
        if (canvas) {
          canvas.className = "absolute inset-0 h-full w-full object-contain bg-black";
          host.appendChild(canvas);
        }
        return;
      }
      if (vtuberMode) {
        const canvas = avatarPublishRef.current?.getPreviewCanvas();
        if (canvas) {
          canvas.className = "absolute inset-0 h-full w-full object-cover";
          host.appendChild(canvas);
          setPreviewCanvasMounted(true);
        } else {
          setPreviewCanvasMounted(false);
        }
        return;
      }
      setPreviewCanvasMounted(false);
      const canvas = getCanvas() ?? displayCanvas;
      if (canvas) {
        canvas.className = "absolute inset-0 h-full w-full object-cover";
        host.appendChild(canvas);
      }
    },
    [displayCanvas, getCanvas, screenOn, vtuberMode]
  );

  const attachPreviewCanvas = useCallback(() => {
    const host = previewHostRef.current;
    if (!host) return;
    mountPreviewCanvas(host);
  }, [mountPreviewCanvas]);

  /** 카메라 캡처 다이얼로그와 동일 — ref callback 교체로 host가 null이 되는 레이스를 피한다 */
  useEffect(() => {
    attachPreviewCanvas();
  }, [
    attachPreviewCanvas,
    splitCollab?.coHostUserId,
    vtuberMode,
    avatarLayout,
    displayCanvas,
    filterPreviewReady,
    screenOn,
  ]);

  useEffect(() => {
    if (!vtuberMode || screenOn || !ready) return;
    setPreviewLoadTimedOut(false);
    let cancelled = false;
    let attempts = 0;
    const tryAttach = () => {
      if (cancelled || attempts > 300) return;
      attempts += 1;
      attachPreviewCanvas();
      if (!avatarPublishRef.current?.getPreviewCanvas()) {
        requestAnimationFrame(tryAttach);
      }
    };
    tryAttach();
    const onPreviewReady = () => attachPreviewCanvas();
    window.addEventListener(LIVE_AVATAR_PREVIEW_READY_EVENT, onPreviewReady);
    const timeout = window.setTimeout(() => {
      if (!cancelled && !previewCanvasMounted) setPreviewLoadTimedOut(true);
    }, 12000);
    return () => {
      cancelled = true;
      window.removeEventListener(LIVE_AVATAR_PREVIEW_READY_EVENT, onPreviewReady);
      window.clearTimeout(timeout);
    };
  }, [vtuberMode, screenOn, ready, attachPreviewCanvas, equipped2dId, previewCanvasMounted]);

  const handleWhipDisconnect = useCallback(() => {
    setWhipConnected(false);
    setLiveError(t("live.s4mi74d"));
  }, []);

  const restartWhipWithStream = useCallback(
    async (stream: MediaStream) => {
      if (!whipConnected || !whipUrl) return;
      whipRef.current?.stop();
      const pub = new CloudflareWhipPublisher();
      whipRef.current = pub;
      await pub.start(channelId, stream, { onDisconnect: handleWhipDisconnect });
      setWhipConnected(true);
    },
    [channelId, whipConnected, whipUrl, handleWhipDisconnect]
  );

  const applyVtuberMode = useCallback(
    async (next: boolean, layout: LiveAvatarLayout = avatarLayout) => {
      setVtuberMode(next);
      setAvatarLayout(layout);
      sessionStorage.setItem(VTUBER_STORAGE_KEY, next ? "1" : "0");
      sessionStorage.setItem(VTUBER_LAYOUT_KEY, layout);

      if (next) {
        setPhotoAvatarRenderMode("flat2d");
        await stopFilterPipeline({ stopTracks: false });
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      } else {
        avatarPublishRef.current?.detachCameraStream();
      }

      streamRef.current = null;
      const stream = await ensureLocalStream({ vtuber: next, layout });
      attachPreviewCanvas();

      if (whipConnected && stream) {
        await restartWhipWithStream(stream);
      }
    },
    [
      avatarLayout,
      attachPreviewCanvas,
      ensureLocalStream,
      restartWhipWithStream,
      stopFilterPipeline,
      whipConnected,
    ]
  );

  const equip2dCharacter = useCallback(
    async (_characterId: string) => {
      await applyVtuberMode(true);
    },
    [applyVtuberMode]
  );

  const unequip2dCharacter = useCallback(async () => {
    await applyVtuberMode(false);
  }, [applyVtuberMode]);

  useEffect(() => {
    if (!ready || (publishState !== "idle" && publishState !== "live_here")) return;
    void ensureLocalStream()
      .then(() => attachPreviewCanvas())
      .catch((e) => {
        setLiveError(e instanceof Error ? e.message : t("live.sr7k9zk"));
      });
  }, [ready, publishState, ensureLocalStream, attachPreviewCanvas]);

  /** WHIP·카메라는 언마운트 시에만 정리 (publishState 변경 시 cleanup 하면 송출이 즉시 끊김) */
  useEffect(() => {
    return () => {
      whipRef.current?.stop();
      avatarPublishRef.current?.detachCameraStream();
      screenCompositorRef.current?.stop();
      screenDisplayRef.current?.getTracks().forEach((t) => t.stop());
      void stopFilterPipeline({ stopTracks: false });
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
      streamRef.current = null;
    };
  }, [stopFilterPipeline]);

  const connectWhip = useCallback(
    async (markLiveInDb: boolean) => {
      if (!whipUrl) return;
      const stream = await ensureLocalStream();
      stream.getVideoTracks().forEach((t) => {
        t.enabled = true;
      });
      setCamOn(true);
      // 필터 캔버스 미리보기가 준비되기 전에는 raw <video> 폴백을 유지한다
      if (!screenOn && !vtuberMode && rawStreamRef.current) {
        bindCameraFallbackPreview(rawStreamRef.current);
      }
      attachPreviewCanvas();

      const pub = new CloudflareWhipPublisher();
      whipRef.current = pub;
      await pub.start(channelId, stream, { onDisconnect: handleWhipDisconnect });
      setWhipConnected(true);
      reconnectAttemptRef.current = 0;
      setLiveError("");

      if (markLiveInDb) {
        const tabId = getOrCreatePublisherTabId();
        let res: Awaited<ReturnType<typeof startBrowserLiveBroadcast>>;
        try {
          res = await startBrowserLiveBroadcast(channelId, tabId);
        } catch (e) {
          const msg =
            e instanceof Error && e.message === "Failed to fetch"
              ? t("live.s1423bvb")
              : e instanceof Error
                ? e.message
                : t("live.s9nugav");
          throw new Error(msg);
        }
        if ("error" in res && res.error) {
          whipRef.current?.stop();
          setWhipConnected(false);
          throw new Error(res.error);
        }
        setPublishState("live_here");
      }
    },
    [
      channelId,
      whipUrl,
      ensureLocalStream,
      screenOn,
      vtuberMode,
      bindCameraFallbackPreview,
      attachPreviewCanvas,
      handleWhipDisconnect,
    ]
  );

  const handleGoLive = useCallback(async () => {
    setGoingLive(true);
    setLiveError("");
    try {
      await connectWhip(true);
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : t("live.s9nugav"));
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
      setLiveError(e instanceof Error ? e.message : t("live.s1yvj9ul"));
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

    if (screenOn) {
      if (vtuberMode) {
        screenCompositorRef.current?.setAvatarVisible(next);
      } else {
        screenCompositorRef.current?.setCameraVisible(next);
      }
      setCamOn(next);
      return;
    }

    if (vtuberMode && !screenOn) {
      avatarPublishRef.current?.setCameraVisible(next);
      setCamOn(next);
      return;
    }

    stream.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    rawStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCamOn(next);
  }

  async function toggleScreen() {
    if (!whipUrl) return;
    if (!screenOn) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 30 } },
          audio: false,
        });
        await stopFilterPipeline({ stopTracks: false });
        if (vtuberMode) {
          avatarPublishRef.current?.setScreenOverlayMode(true);
        }
        const stream = await buildScreenShareStream(display);
        attachPreviewCanvas();
        if (whipConnected) {
          await restartWhipWithStream(stream);
        }
        setScreenOn(true);
        setCamOn(true);
        setLiveError("");
      } catch {
        setLiveError(t("live.s1edioqk"));
      }
      return;
    }

    await stopScreenShare();
    streamRef.current = null;
    const stream = await ensureLocalStream();
    attachPreviewCanvas();
    if (whipConnected && stream) {
      await restartWhipWithStream(stream);
    }
  }

  const handleScreenShareEnded = useCallback(async () => {
    if (!screenOn) return;
    await stopScreenShare();
    streamRef.current = null;
    try {
      const stream = await ensureLocalStream();
      attachPreviewCanvas();
      if (whipConnected && stream) await restartWhipWithStream(stream);
    } catch {
      /* ignore */
    }
  }, [
    screenOn,
    stopScreenShare,
    ensureLocalStream,
    attachPreviewCanvas,
    whipConnected,
    restartWhipWithStream,
  ]);

  useEffect(() => {
    if (!screenOn) return;
    const track = screenDisplayRef.current?.getVideoTracks()[0];
    if (!track) return;
    const onEnded = () => {
      void handleScreenShareEnded();
    };
    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
  }, [screenOn, handleScreenShareEnded]);

  if (publishState === "loading") {
    return (
      <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">{t("live.s60s7ll")}</span>
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
        <span className="text-sm">{t("live.cloudflare")}</span>
      </div>
    );
  }

  const needsReconnect = serverLive && !whipConnected;

  const rootClass = immersive
    ? "relative flex flex-col h-full min-h-[100dvh] w-full gap-0"
    : "flex flex-col gap-5 w-full";
  const previewClass = immersive
    ? "relative flex-1 min-h-0 overflow-hidden bg-black"
    : "relative w-full aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-border/50 shadow-sm";
  const controlsWrapClass = immersive
    ? "absolute bottom-0 left-0 right-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+9rem)] pt-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-2 pointer-events-auto"
    : "flex flex-col gap-3 w-full pb-2";

  const previewInner = (
    <>
      {/* 필터 캔버스가 준비되기 전·실패 시에도 카메라가 바로 보이도록 raw video 폴백 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={
          !vtuberMode && !screenOn
            ? "absolute inset-0 z-0 h-full w-full object-cover scale-x-[-1]"
            : "hidden"
        }
      />
      <div
        ref={previewHostRef}
        className={
          vtuberMode || screenOn || filterPreviewReady
            ? "absolute inset-0 z-[1]"
            : "pointer-events-none absolute inset-0 z-[1] opacity-0"
        }
      />
      {whipConnected && !immersive && !splitCollab && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-folk-terracotta text-white text-[10px] font-bold z-10 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      )}
      {vtuberMode && !screenOn && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold z-10">
          2D
        </span>
      )}
      {vtuberMode && !screenOn && !previewCanvasMounted && (
        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-zinc-800 to-black text-white/80 px-4 text-center">
          {previewLoadTimedOut ? (
            <>
              <p className="text-sm font-medium text-amber-200">{t("live.s9ej12l")}</p>
              <p className="text-[11px] text-white/55">
                {t("live.s1qgpq37")}
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-7 w-7 animate-spin opacity-80" />
              <p className="text-sm font-medium">{t("live.scpzsqu")}</p>
              <p className="text-[11px] text-white/55">{t("live.s1h35vlh")}</p>
            </>
          )}
        </div>
      )}
      {screenOn && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold z-10">
          {vtuberMode ? t("live.s1oaywni") : t("live.s96s11n")}
        </span>
      )}
      {chatOverlayEnabled && !immersive && (
        <LiveVideoChatOverlay variant={vtuberMode || screenOn ? "vtuber" : "default"} />
      )}
      <LiveOverlayLayer className="z-20" />
    </>
  );

  const libraryPanel = !screenOn ? (
    <Live2dLibraryPanel
      compact={immersive}
      equippedId={equipped2dId}
      vtuberActive={vtuberMode}
      onEquip={async (id) => {
        try {
          await equip2dCharacter(id);
        } catch (e) {
          setLiveError(e instanceof Error ? e.message : t("live.su8vqji"));
        }
      }}
      onUnequip={async () => {
        try {
          await unequip2dCharacter();
        } catch (e) {
          setLiveError(e instanceof Error ? e.message : t("live.sbzg7ni"));
        }
      }}
    />
  ) : null;

  const broadcastControls = (
    <>
      <LiveOverlayToolbar compact={immersive} />
      <LiveGamesHubLink compact={immersive} />

      {!screenOn && !vtuberMode && (
        <FaceFilterStrip
          value={filterId}
          onChange={setFilterId}
          disabled={(goingLive && whipConnected) || vtuberMode}
          faceTrackingNeeded={faceTrackingNeeded}
          faceTrackingReady={faceTrackingReady}
          landmarkerState={landmarkerState}
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
          {micOn ? t("live.ss6ou8") : t("live.su4r74")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1"
          onClick={() => void toggleCam()}
        >
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          {screenOn && vtuberMode
            ? camOn
              ? t("live.s1hv3z9y")
              : t("live.spk0uxu")
            : camOn
              ? t("live.s1e4vqz4")
              : t("live.sv5bmk")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1"
          onClick={() => void toggleScreen()}
        >
          <MonitorUp className="h-4 w-4" />
          {screenOn ? t("live.smldasf") : t("live.s96s11n")}
        </Button>
        <Button
          type="button"
          variant={chatOverlayEnabled ? "default" : "outline"}
          size="sm"
          className="rounded-xl gap-1"
          onClick={() => setChatOverlayEnabled(!chatOverlayEnabled)}
        >
          <MessageSquare className="h-4 w-4" />
          {chatOverlayEnabled ? t("live.s1xlyjwf") : t("live.s1xeipqj")}
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
              ? t("live.s1syju03")
              : t("live.si72arp")}
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
          {t("live.s34ypqj")}
        </p>
      )}
    </>
  );

  return (
    <div className={rootClass}>
      <LiveAvatarPublishLayer
        ref={avatarPublishRef}
        enabled={vtuberMode && ready}
        renderMode="flat2d"
        layout={avatarLayout}
        overlayState={overlayCtx?.state ?? null}
      />

      {splitCollab && !immersive ? (
        <LiveHostCollabPreview
          channelId={channelId}
          coHostUserId={splitCollab.coHostUserId}
          coHostLabel={splitCollab.coHostLabel}
        >
          {previewInner}
        </LiveHostCollabPreview>
      ) : (
        <div className={previewClass}>{previewInner}</div>
      )}

      {!immersive && (
        <div className="flex flex-col gap-3 w-full">
          {broadcastControls}
          <LiveHostCollabPasswordStrip channelId={channelId} password={collabPassword} compact />
        </div>
      )}

      {!immersive && libraryPanel && (
        <div className="flex flex-col gap-3 w-full mt-2 pt-4 border-t border-border/50">
          {libraryPanel}
        </div>
      )}

      {immersive && (
        <div className={controlsWrapClass}>
          {libraryPanel}
          {broadcastControls}
        </div>
      )}
    </div>
  );
}
