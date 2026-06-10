"use client";

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
          const msg = e instanceof Error ? e.message : "연결 실패";
          setLoadError(
            msg === "Failed to fetch"
              ? "방송 서버에 연결하지 못했습니다. 네트워크·로그인 상태를 확인해 주세요."
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
    setScreenOn(false);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
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

    compositor.start(display, rawStreamRef.current);
    screenDisplayRef.current = display;

    const video = compositor.getStream();
    const audio = rawStreamRef.current?.getAudioTracks() ?? [];
    const out = new MediaStream([...(video?.getVideoTracks() ?? []), ...audio]);
    streamRef.current = out;
    return out;
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

      if (!screenOn && streamRef.current && rawStreamRef.current) {
        if (useVtuber && avatarPublishRef.current?.getPublishStream()) {
          return streamRef.current;
        }
        if (!useVtuber) {
          return streamRef.current;
        }
      }

      let raw = rawStreamRef.current;
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

      if (!raw) throw new Error("카메라 스트림을 시작할 수 없습니다.");

      if (useVtuber && !screenOn) {
        let avatar = avatarPublishRef.current;
        const waitStart = performance.now();
        while (!avatar && performance.now() - waitStart < 8000) {
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          avatar = avatarPublishRef.current;
        }
        if (!avatar) throw new Error("VTuber 아바타를 준비하지 못했습니다.");
        avatar.setLayout(layout);
        await avatar.attachCameraStream(raw);
        await avatar.waitForReady();
        const pub = avatar.getPublishStream();
        if (!pub) throw new Error("VTuber 송출 스트림을 만들지 못했습니다.");
        streamRef.current = pub;
        return pub;
      }

      await attachRawStream(raw, { mirrored: true });
      await waitForBroadcastReady().catch(() => undefined);
      const composite = getCompositeStream();
      streamRef.current = composite ?? raw;
      return streamRef.current;
    },
    [
      attachRawStream,
      getCompositeStream,
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
      host.innerHTML = "";
      if (screenOn) {
        const canvas = screenCompositorRef.current?.canvas;
        if (canvas) {
          canvas.className = "absolute inset-0 w-full h-full object-contain bg-black";
          host.appendChild(canvas);
        }
        return;
      }
      if (vtuberMode && !screenOn) {
        const canvas = avatarPublishRef.current?.getPreviewCanvas();
        if (canvas) {
          canvas.className = "absolute inset-0 w-full h-full object-cover";
          host.appendChild(canvas);
          setPreviewCanvasMounted(true);
        } else {
          setPreviewCanvasMounted(false);
        }
        return;
      }
      setPreviewCanvasMounted(false);
      if (displayCanvas && !screenOn) {
        displayCanvas.className = "absolute inset-0 w-full h-full object-cover";
        host.appendChild(displayCanvas);
      }
    },
    [displayCanvas, screenOn, vtuberMode]
  );

  const attachPreviewCanvas = useCallback(() => {
    const host = previewHostRef.current;
    if (!host) return;
    mountPreviewCanvas(host);
  }, [mountPreviewCanvas]);

  const bindPreviewHostRef = useCallback(
    (host: HTMLDivElement | null) => {
      const prev = previewHostRef.current;
      if (prev) {
        const canvas = screenOn
          ? screenCompositorRef.current?.canvas
          : vtuberMode && !screenOn
            ? avatarPublishRef.current?.getPreviewCanvas()
            : displayCanvas;
        if (canvas && canvas.parentElement === prev) {
          prev.removeChild(canvas);
        }
      }
      previewHostRef.current = host;
      if (host && !screenOn) mountPreviewCanvas(host);
    },
    [displayCanvas, screenOn, vtuberMode, mountPreviewCanvas]
  );

  /** splitCollab 전환 시 previewHost DOM이 교체되므로 canvas를 다시 붙인다 */
  useEffect(() => {
    attachPreviewCanvas();
    return () => {
      const host = previewHostRef.current;
      if (!host) return;
      const canvas =
        vtuberMode && !screenOn
          ? avatarPublishRef.current?.getPreviewCanvas()
          : displayCanvas;
      if (canvas && canvas.parentElement === host) {
        host.removeChild(canvas);
      }
    };
  }, [attachPreviewCanvas, splitCollab?.coHostUserId, vtuberMode, avatarLayout, displayCanvas, screenOn]);

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
    setLiveError("송출 연결이 끊겼습니다. 다시 연결 중…");
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
        await stopFilterPipeline();
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
        setLiveError(e instanceof Error ? e.message : "카메라·마이크 권한이 필요합니다.");
      });
  }, [ready, publishState, ensureLocalStream, attachPreviewCanvas]);

  /** WHIP·카메라는 언마운트 시에만 정리 (publishState 변경 시 cleanup 하면 송출이 즉시 끊김) */
  useEffect(() => {
    return () => {
      whipRef.current?.stop();
      avatarPublishRef.current?.detachCameraStream();
      screenCompositorRef.current?.stop();
      screenDisplayRef.current?.getTracks().forEach((t) => t.stop());
      void stopFilterPipeline();
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
      if (!screenOn && videoRef.current) videoRef.current.srcObject = null;

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
              ? "방송 상태 저장 요청이 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요."
              : e instanceof Error
                ? e.message
                : "방송 시작 실패";
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

    if (screenOn) {
      screenCompositorRef.current?.setCameraVisible(next);
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
        await stopFilterPipeline();
        if (vtuberMode) {
          avatarPublishRef.current?.detachCameraStream();
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
        setLiveError("화면 공유가 취소되었습니다.");
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
    : "flex flex-col gap-5 w-full";
  const previewClass = immersive
    ? "relative flex-1 min-h-0 overflow-hidden bg-black"
    : "relative w-full aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-border/50 shadow-sm";
  const controlsWrapClass = immersive
    ? "absolute bottom-0 left-0 right-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+9rem)] pt-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-2 pointer-events-auto"
    : "flex flex-col gap-3 w-full pb-2";

  const previewInner = (
    <>
      <div ref={bindPreviewHostRef} className="absolute inset-0 z-0" />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
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
              <p className="text-sm font-medium text-amber-200">2D 캐릭터를 불러오지 못했습니다</p>
              <p className="text-[11px] text-white/55">
                라이브러리에서 캐릭터를 다시 더블클릭하거나 2D 스튜디오에서 재저장해 보세요.
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-7 w-7 animate-spin opacity-80" />
              <p className="text-sm font-medium">2D 캐릭터 불러오는 중…</p>
              <p className="text-[11px] text-white/55">잠시 후 미리보기가 표시됩니다</p>
            </>
          )}
        </div>
      )}
      {screenOn && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold z-10">
          화면 공유
        </span>
      )}
      {chatOverlayEnabled && !immersive && <LiveVideoChatOverlay channelId={channelId} />}
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
          setLiveError(e instanceof Error ? e.message : "2D 아바타 적용 실패");
        }
      }}
      onUnequip={async () => {
        try {
          await unequip2dCharacter();
        } catch (e) {
          setLiveError(e instanceof Error ? e.message : "2D 아바타 해제 실패");
        }
      }}
    />
  ) : null;

  const broadcastControls = (
    <>
      <LiveOverlayToolbar compact={immersive} />

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
        <Button
          type="button"
          variant={chatOverlayEnabled ? "default" : "outline"}
          size="sm"
          className="rounded-xl gap-1"
          onClick={() => setChatOverlayEnabled(!chatOverlayEnabled)}
        >
          <MessageSquare className="h-4 w-4" />
          {chatOverlayEnabled ? "채팅 오버레이 끔" : "채팅 오버레이"}
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
