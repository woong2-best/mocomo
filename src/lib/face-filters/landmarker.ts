"use client";

import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export type LandmarkerLoadState = "idle" | "loading" | "ready" | "error";

let landmarkerPromise: Promise<FaceLandmarker | null> | null = null;
let loadState: LandmarkerLoadState = "idle";
let loadError = "";
const stateListeners = new Set<(s: LandmarkerLoadState, err: string) => void>();

const WASM_LOCAL = "/mediapipe/wasm";
const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_LOCAL = "/mediapipe/models/face_landmarker.task";
const MODEL_REMOTE =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function setLoadState(next: LandmarkerLoadState, err = "") {
  loadState = next;
  loadError = err;
  for (const fn of stateListeners) fn(next, err);
}

export function getLandmarkerLoadState(): { state: LandmarkerLoadState; error: string } {
  return { state: loadState, error: loadError };
}

export function subscribeLandmarkerLoadState(
  fn: (state: LandmarkerLoadState, error: string) => void
): () => void {
  stateListeners.add(fn);
  fn(loadState, loadError);
  return () => stateListeners.delete(fn);
}

async function createLandmarker(wasmBase: string, modelPath: string): Promise<FaceLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(wasmBase);
  try {
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
  } catch {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
  }
}

async function loadLandmarkerOnce(): Promise<FaceLandmarker | null> {
  if (typeof window === "undefined") return null;
  setLoadState("loading");

  const attempts: { wasm: string; model: string }[] = [
    { wasm: WASM_LOCAL, model: MODEL_LOCAL },
    { wasm: WASM_CDN, model: MODEL_REMOTE },
  ];

  let lastErr = "";
  for (const { wasm, model } of attempts) {
    try {
      const lm = await createLandmarker(wasm, model);
      setLoadState("ready");
      return lm;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  setLoadState("error", lastErr || "얼굴 인식 모듈을 불러오지 못했습니다.");
  return null;
}

/** 스튜디오 진입 시 미리 로드 */
export function preloadFaceLandmarker(): void {
  if (typeof window === "undefined") return;
  void getFaceLandmarker();
}

export async function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (typeof window === "undefined") return null;
  if (!landmarkerPromise) {
    landmarkerPromise = loadLandmarkerOnce();
  }
  return landmarkerPromise;
}

/** 실패 시 재시도 */
export async function retryFaceLandmarker(): Promise<FaceLandmarker | null> {
  landmarkerPromise = null;
  setLoadState("idle");
  return getFaceLandmarker();
}
