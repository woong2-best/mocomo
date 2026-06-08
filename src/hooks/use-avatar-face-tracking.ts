"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFaceLandmarker,
  preloadFaceLandmarker,
  subscribeLandmarkerLoadState,
  type LandmarkerLoadState,
} from "@/lib/face-filters/landmarker";
import {
  EMPTY_TRACKING_FRAME,
  extractBodyPose,
  extractHands,
  extractTrackingFrame,
  getHandLandmarker,
  getPoseLandmarker,
  preloadBodyLandmarkers,
  TrackingSmoother,
  VoiceLipSync,
  AiLipSync,
  SpeechLipSync,
  type AvatarTrackingFrame,
} from "@/lib/virtual-avatar/face-tracking";

export function useAvatarFaceTracking() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<AvatarTrackingFrame>(EMPTY_TRACKING_FRAME);
  const smootherRef = useRef(new TrackingSmoother());
  const voiceRef = useRef(new VoiceLipSync());
  const aiRef = useRef(new AiLipSync());
  const speechRef = useRef(new SpeechLipSync());
  const lastTickRef = useRef(0);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const externalStreamRef = useRef(false);

  const [active, setActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [legsDetected, setLegsDetected] = useState(false);
  const [handsDetected, setHandsDetected] = useState(false);
  const [error, setError] = useState("");
  const [landmarkerState, setLandmarkerState] = useState<LandmarkerLoadState>("idle");
  const [starting, setStarting] = useState(false);
  const [blendShapeCount, setBlendShapeCount] = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const [aiLipActive, setAiLipActive] = useState(false);
  const [speechLipActive, setSpeechLipActive] = useState(false);

  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  const getFrame = useCallback(() => frameRef.current, []);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  const detectLoop = useCallback(async () => {
    if (!runningRef.current) return;

    const video = videoRef.current;
    const [faceLm, poseLm, handLm] = await Promise.all([
      getFaceLandmarker(),
      getPoseLandmarker(),
      getHandLandmarker(),
    ]);
    const now = performance.now();
    const dt = lastTickRef.current > 0 ? Math.min(0.05, (now - lastTickRef.current) / 1000) : 1 / 60;
    lastTickRef.current = now;

    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      try {
        const faceResult = faceLm ? faceLm.detectForVideo(video, now) : null;
        const poseResult = poseLm ? poseLm.detectForVideo(video, now) : null;
        const handResult = handLm ? handLm.detectForVideo(video, now) : null;

        const body = extractBodyPose(poseResult ?? undefined, smootherRef.current, dt);
        const hands = extractHands(handResult ?? undefined, smootherRef.current, dt);
        const voiceVisemes = voiceRef.current.sample();
        const voiceLevel = voiceRef.current.getLevel();
        void aiRef.current.tick(voiceLevel);
        const aiVisemes = aiRef.current.getVisemes();
        const speechVisemes = speechRef.current.sample();

        if (faceResult) {
          const frame = extractTrackingFrame(faceResult, w, h, smootherRef.current, dt, {
            body,
            hands,
            voiceLevel,
            voiceVisemes,
            aiVisemes: aiRef.current.isActive() ? aiVisemes : null,
            speechVisemes: speechRef.current.isActive() ? speechVisemes : null,
          });
          if (frame) {
            frameRef.current = frame;
            setBlendShapeCount(Object.keys(frame.blendShapes).length);
            setFaceDetected(true);
            setBodyDetected(frame.body.detected);
            setLegsDetected(!!(frame.body.leftLeg || frame.body.rightLeg));
            setHandsDetected(!!(frame.hands.left?.detected || frame.hands.right?.detected));
            setVoiceActive(voiceLevel > 0.05);
            setAiLipActive(aiRef.current.isActive() && voiceLevel > 0.06);
            setSpeechLipActive(speechRef.current.isActive());
          } else {
            frameRef.current = { ...EMPTY_TRACKING_FRAME, timestamp: now, body, hands, voiceLevel };
            setFaceDetected(false);
            setBodyDetected(body.detected);
            setLegsDetected(!!(body.leftLeg || body.rightLeg));
            setHandsDetected(!!(hands.left?.detected || hands.right?.detected));
          }
        }
      } catch {
        /* skip frame */
      }
    }

    rafRef.current = requestAnimationFrame(() => {
      void detectLoop();
    });
  }, []);

  const stop = useCallback(() => {
    stopLoop();
    if (!externalStreamRef.current) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    externalStreamRef.current = false;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    voiceRef.current.detach();
    aiRef.current.detach();
    speechRef.current.stop();
    smootherRef.current.reset();
    lastTickRef.current = 0;
    frameRef.current = EMPTY_TRACKING_FRAME;
    setActive(false);
    setFaceDetected(false);
    setBodyDetected(false);
    setLegsDetected(false);
    setHandsDetected(false);
    setBlendShapeCount(0);
    setVoiceActive(false);
    setAiLipActive(false);
    setSpeechLipActive(false);
    setError("");
  }, [stopLoop]);

  const detachExternalStream = useCallback(() => {
    stop();
  }, [stop]);

  const attachExternalStream = useCallback(
    async (stream: MediaStream) => {
      if (!videoRef.current) {
        setError("카메라를 준비하지 못했습니다.");
        return;
      }

      setError("");
      externalStreamRef.current = true;
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = new MediaStream(stream.getVideoTracks());
      video.muted = true;
      video.playsInline = true;
      await video.play().catch(() => undefined);

      const voiceOk = await voiceRef.current.attach(stream);
      await aiRef.current.attach(stream);
      speechRef.current.start("ko-KR");
      if (!voiceOk) {
        console.warn("[avatar-tracking] microphone unavailable — face-only lip sync");
      }

      smootherRef.current.reset();
      lastTickRef.current = 0;
      runningRef.current = true;
      setActive(true);

      if (!rafRef.current) void detectLoop();
    },
    [detectLoop]
  );

  const start = useCallback(async () => {
    if (runningRef.current || starting) return;

    if (!videoRef.current) {
      setError("카메라를 준비하지 못했습니다.");
      return;
    }

    setError("");
    setStarting(true);

    try {
      externalStreamRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      const voiceOk = await voiceRef.current.attach(stream);
      await aiRef.current.attach(stream);
      speechRef.current.start("ko-KR");
      if (!voiceOk) {
        console.warn("[avatar-tracking] microphone unavailable — face-only lip sync");
      }

      smootherRef.current.reset();
      lastTickRef.current = 0;
      runningRef.current = true;
      setActive(true);
      void detectLoop();
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError") {
        setError("카메라·마이크 권한을 허용해 주세요.");
      } else if (name === "NotFoundError") {
        setError("카메라를 찾을 수 없습니다.");
      } else {
        setError("카메라를 시작할 수 없습니다.");
      }
      stop();
    } finally {
      setStarting(false);
    }
  }, [detectLoop, starting, stop]);

  useEffect(() => {
    preloadFaceLandmarker();
    preloadBodyLandmarkers();

    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.setAttribute("aria-hidden", "true");
    video.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    videoRef.current = video;

    return subscribeLandmarkerLoadState((state) => {
      setLandmarkerState(state);
    });
  }, []);

  useEffect(() => {
    return () => {
      stop();
      videoRef.current?.remove();
      videoRef.current = null;
    };
  }, [stop]);

  return {
    getFrame,
    active,
    faceDetected,
    bodyDetected,
    legsDetected,
    handsDetected,
    voiceActive,
    aiLipActive,
    speechLipActive,
    speechSupported,
    error,
    landmarkerState,
    starting,
    blendShapeCount,
    start,
    stop,
    attachExternalStream,
    detachExternalStream,
  };
}
