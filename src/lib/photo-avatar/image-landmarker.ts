"use client";

import type { FaceLandmarker } from "@mediapipe/tasks-vision";

const WASM_LOCAL = "/mediapipe/wasm";
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_LOCAL = "/mediapipe/models/face_landmarker.task";
const MODEL_REMOTE =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let imageLandmarkerPromise: Promise<FaceLandmarker | null> | null = null;

async function createImageLandmarker(wasmBase: string, modelPath: string): Promise<FaceLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(wasmBase);
  try {
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelPath, delegate: "GPU" },
      runningMode: "IMAGE",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
  } catch {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelPath, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
  }
}

export async function getImageFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (typeof window === "undefined") return null;
  if (!imageLandmarkerPromise) {
    imageLandmarkerPromise = (async () => {
      for (const { wasm, model } of [
        { wasm: WASM_LOCAL, model: MODEL_LOCAL },
        { wasm: WASM_CDN, model: MODEL_REMOTE },
      ]) {
        try {
          return await createImageLandmarker(wasm, model);
        } catch {
          /* try next */
        }
      }
      return null;
    })();
  }
  return imageLandmarkerPromise;
}
