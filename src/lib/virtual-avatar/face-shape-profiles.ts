import type { AvatarFaceParams, FaceShape } from "@/lib/virtual-avatar/types";

export type FaceShapeBoneProfile = {
  head: { x: number; y: number; z: number };
  jaw: { x: number; y: number; z: number };
};

/** 얼굴형 버튼 클릭 시 적용되는 슬라이더 기본값 + 본 스케일 */
export type FaceShapeProfile = FaceShapeBoneProfile & {
  patch: Pick<
    AvatarFaceParams,
    "jawWidth" | "jawAngle" | "chinLength" | "chinPoint" | "cheekbone" | "forehead" | "noseWidth"
  >;
};

export const FACE_SHAPE_LABELS: Record<FaceShape, string> = {
  oval: "계란형",
  round: "둥근형",
  square: "각진형",
  long: "긴형",
  heart: "하트형",
  invertedTriangle: "역삼각형",
  diamond: "다이아몬드형",
  triangle: "삼각형",
};

export const FACE_SHAPE_PROFILES: Record<FaceShape, FaceShapeProfile> = {
  oval: {
    head: { x: 0.94, y: 1.08, z: 0.98 },
    jaw: { x: 0.9, y: 1.02, z: 0.96 },
    patch: { jawWidth: 44, jawAngle: 48, chinLength: 50, chinPoint: 50, cheekbone: 46, forehead: 52, noseWidth: 44 },
  },
  round: {
    head: { x: 1.14, y: 1.06, z: 1.06 },
    jaw: { x: 1.1, y: 0.92, z: 1.04 },
    patch: { jawWidth: 62, jawAngle: 46, chinLength: 42, chinPoint: 44, cheekbone: 58, forehead: 50, noseWidth: 48 },
  },
  square: {
    head: { x: 1.16, y: 1.02, z: 1.08 },
    jaw: { x: 1.2, y: 0.96, z: 1.1 },
    patch: { jawWidth: 68, jawAngle: 58, chinLength: 46, chinPoint: 54, cheekbone: 52, forehead: 48, noseWidth: 50 },
  },
  long: {
    head: { x: 0.86, y: 1.18, z: 0.94 },
    jaw: { x: 0.84, y: 1.12, z: 0.92 },
    patch: { jawWidth: 38, jawAngle: 50, chinLength: 62, chinPoint: 52, cheekbone: 42, forehead: 56, noseWidth: 42 },
  },
  heart: {
    head: { x: 1.1, y: 1.08, z: 0.9 },
    jaw: { x: 0.76, y: 1.04, z: 0.88 },
    patch: { jawWidth: 36, jawAngle: 52, chinLength: 54, chinPoint: 64, cheekbone: 58, forehead: 60, noseWidth: 42 },
  },
  invertedTriangle: {
    head: { x: 1.12, y: 1.04, z: 0.96 },
    jaw: { x: 0.74, y: 0.98, z: 0.9 },
    patch: { jawWidth: 34, jawAngle: 50, chinLength: 44, chinPoint: 58, cheekbone: 62, forehead: 62, noseWidth: 40 },
  },
  diamond: {
    head: { x: 0.88, y: 1.1, z: 0.96 },
    jaw: { x: 0.8, y: 1.06, z: 0.92 },
    patch: { jawWidth: 40, jawAngle: 54, chinLength: 52, chinPoint: 60, cheekbone: 70, forehead: 38, noseWidth: 44 },
  },
  triangle: {
    head: { x: 1.1, y: 1.0, z: 1.04 },
    jaw: { x: 1.22, y: 0.94, z: 1.1 },
    patch: { jawWidth: 72, jawAngle: 56, chinLength: 44, chinPoint: 48, cheekbone: 48, forehead: 36, noseWidth: 52 },
  },
};

export function getFaceShapeLabel(shape: FaceShape): string {
  return FACE_SHAPE_LABELS[shape] ?? FACE_SHAPE_LABELS.oval;
}

export function getFaceShapePatch(shape: FaceShape): Partial<AvatarFaceParams> {
  const profile = FACE_SHAPE_PROFILES[shape];
  return { faceShape: shape, ...profile.patch };
}

export function normalizeFaceShape(value: unknown): FaceShape {
  if (typeof value === "string" && value in FACE_SHAPE_PROFILES) {
    return value as FaceShape;
  }
  return "oval";
}

export function getFaceShapeBones(shape: FaceShape): FaceShapeBoneProfile {
  return FACE_SHAPE_PROFILES[shape] ?? FACE_SHAPE_PROFILES.oval;
}
