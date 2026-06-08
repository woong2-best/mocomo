import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { FaceExpression } from "@/lib/face-filters/ar/geometry";
import { estimateHeadPose } from "@/lib/face-filters/head-pose";
import type {
  AvatarTrackingFrame,
  BodyTrackingState,
  FaceBlendShapeMap,
  HandsTrackingState,
  VisemeWeights,
} from "@/lib/virtual-avatar/tracking/types";
import { EMPTY_BODY, EMPTY_HANDS } from "@/lib/virtual-avatar/tracking/types";
import { TrackingSmoother } from "@/lib/virtual-avatar/tracking/smooth";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function readAllBlendShapes(result: FaceLandmarkerResult): FaceBlendShapeMap {
  const cats = result.faceBlendshapes?.[0]?.categories;
  if (!cats) return {};
  const out: FaceBlendShapeMap = {};
  for (const c of cats) {
    if (c.categoryName) out[c.categoryName] = clamp01(c.score ?? 0);
  }
  return out;
}

function bs(shapes: FaceBlendShapeMap, name: string): number {
  return shapes[name] ?? 0;
}

/** 5모음 립싱크 — ARKit 블렌드셰이프 → VRM viseme */
export function computeVisemes(shapes: FaceBlendShapeMap): VisemeWeights {
  const jawOpen = bs(shapes, "jawOpen");
  const funnel = bs(shapes, "mouthFunnel");
  const pucker = bs(shapes, "mouthPucker");
  const smile = (bs(shapes, "mouthSmileLeft") + bs(shapes, "mouthSmileRight")) * 0.5;
  const stretch =
    (bs(shapes, "mouthStretchLeft") + bs(shapes, "mouthStretchRight")) * 0.5;
  const close = bs(shapes, "mouthClose");

  return {
    aa: clamp01(jawOpen * 0.95),
    ih: clamp01(close * 0.55 + stretch * 0.45),
    ou: clamp01(pucker * 0.9),
    ee: clamp01(smile * 0.85 + stretch * 0.25),
    oh: clamp01(funnel * 0.9 + jawOpen * 0.15),
  };
}

function summarizeExpression(shapes: FaceBlendShapeMap): FaceExpression {
  return {
    jawOpen: bs(shapes, "jawOpen"),
    smile: (bs(shapes, "mouthSmileLeft") + bs(shapes, "mouthSmileRight")) * 0.5,
    blinkLeft: bs(shapes, "eyeBlinkLeft"),
    blinkRight: bs(shapes, "eyeBlinkRight"),
  };
}

export function extractTrackingFrame(
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  smoother: TrackingSmoother,
  dt: number,
  extras?: {
    body?: BodyTrackingState;
    hands?: HandsTrackingState;
    voiceLevel?: number;
    voiceVisemes?: VisemeWeights | null;
    aiVisemes?: VisemeWeights | null;
    speechVisemes?: VisemeWeights | null;
  }
): AvatarTrackingFrame | null {
  const rawPose = estimateHeadPose(result, w, h);
  if (!rawPose) return null;

  const rawShapes = readAllBlendShapes(result);
  const pose = smoother.smoothHead(rawPose, dt);
  const blendShapes = smoother.smoothBlendShapes(rawShapes, dt);
  const faceVisemes = computeVisemes(blendShapes);

  const voiceLevel = extras?.voiceLevel ?? 0;
  const voiceVisemes = extras?.voiceVisemes ?? null;
  const aiVisemes = extras?.aiVisemes ?? null;
  const speechVisemes = extras?.speechVisemes ?? null;
  let visemes =
    voiceVisemes && voiceLevel > 0.04
      ? mergeVisemesInline(faceVisemes, voiceVisemes, voiceLevel)
      : faceVisemes;
  if (speechVisemes && voiceLevel > 0.04) {
    visemes = mergeVisemesInline(visemes, speechVisemes, Math.min(0.75, voiceLevel + 0.2));
  }
  if (aiVisemes && voiceLevel > 0.06) {
    visemes = mergeVisemesInline(visemes, aiVisemes, Math.min(0.55, voiceLevel));
  }

  return {
    detected: true,
    timestamp: performance.now(),
    pose,
    blendShapes,
    visemes,
    expression: summarizeExpression(blendShapes),
    body: extras?.body ?? EMPTY_BODY,
    hands: extras?.hands ?? EMPTY_HANDS,
    voiceLevel,
  };
}

function mergeVisemesInline(
  face: VisemeWeights,
  voice: VisemeWeights,
  voiceLevel: number
): VisemeWeights {
  const w = Math.min(0.65, voiceLevel * 1.2);
  const lerp = (a: number, b: number) => a + (b - a) * w;
  return {
    aa: lerp(face.aa, voice.aa),
    ih: lerp(face.ih, voice.ih),
    ou: lerp(face.ou, voice.ou),
    ee: lerp(face.ee, voice.ee),
    oh: lerp(face.oh, voice.oh),
  };
}
