"use client";

import type { FaceLandmarker } from "@mediapipe/tasks-vision";

let landmarkerPromise: Promise<FaceLandmarker | null> | null = null;

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export async function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (typeof window === "undefined") return null;
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        return await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });
      } catch {
        try {
          const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
          const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
          return await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFacialTransformationMatrixes: true,
          });
        } catch {
          return null;
        }
      }
    })();
  }
  return landmarkerPromise;
}
