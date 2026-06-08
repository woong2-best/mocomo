"use client";

import type { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_LOCAL = "/mediapipe/wasm";
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const POSE_LOCAL = "/mediapipe/models/pose_landmarker_lite.task";
const POSE_REMOTE =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const HAND_LOCAL = "/mediapipe/models/hand_landmarker.task";
const HAND_REMOTE =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let posePromise: Promise<PoseLandmarker | null> | null = null;
let handPromise: Promise<HandLandmarker | null> | null = null;

async function createPose(wasm: string, model: string): Promise<PoseLandmarker> {
  const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(wasm);
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: model, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  } catch {
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: model, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  }
}

async function createHand(wasm: string, model: string): Promise<HandLandmarker> {
  const { HandLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(wasm);
  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: model, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
    });
  } catch {
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: model, delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 2,
    });
  }
}

async function loadWithFallback<T>(
  create: (wasm: string, model: string) => Promise<T>
): Promise<T | null> {
  const attempts = [
    { wasm: WASM_LOCAL, model: POSE_LOCAL },
    { wasm: WASM_CDN, model: POSE_REMOTE },
  ];
  for (const { wasm, model } of attempts) {
    try {
      return await create(wasm, model);
    } catch {
      /* try next */
    }
  }
  return null;
}

async function loadHandWithFallback(): Promise<HandLandmarker | null> {
  const attempts = [
    { wasm: WASM_LOCAL, model: HAND_LOCAL },
    { wasm: WASM_CDN, model: HAND_REMOTE },
  ];
  for (const { wasm, model } of attempts) {
    try {
      return await createHand(wasm, model);
    } catch {
      /* try next */
    }
  }
  return null;
}

export function preloadBodyLandmarkers() {
  if (typeof window === "undefined") return;
  void getPoseLandmarker();
  void getHandLandmarker();
}

export async function getPoseLandmarker(): Promise<PoseLandmarker | null> {
  if (typeof window === "undefined") return null;
  if (!posePromise) {
    posePromise = loadWithFallback(createPose);
  }
  return posePromise;
}

export async function getHandLandmarker(): Promise<HandLandmarker | null> {
  if (typeof window === "undefined") return null;
  if (!handPromise) {
    handPromise = loadHandWithFallback();
  }
  return handPromise;
}
