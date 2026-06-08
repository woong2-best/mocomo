import type { FaceExpression } from "@/lib/face-filters/ar/geometry";
import type { HeadPose } from "@/lib/face-filters/head-pose";

export type FaceBlendShapeMap = Record<string, number>;

export type VisemeWeights = {
  aa: number;
  ih: number;
  ou: number;
  ee: number;
  oh: number;
};

export type BoneRotation = { x: number; y: number; z: number };

export type ArmTrackingState = {
  upper: BoneRotation;
  lower: BoneRotation;
  hand: BoneRotation;
  /** CCD IK 손목 타깃 (VRM 로컬) */
  wristTarget?: { x: number; y: number; z: number };
  /** 팔꿈치 pole vector 힌트 */
  elbowPoleZ?: number;
};

export type LegTrackingState = {
  upper: BoneRotation;
  lower: BoneRotation;
  foot: BoneRotation;
};

export type PelvisTrackingState = {
  rotationY: number;
  shiftX: number;
  shiftY: number;
  shiftZ: number;
  leanX: number;
};

export type BodyTrackingState = {
  detected: boolean;
  leftArm: ArmTrackingState | null;
  rightArm: ArmTrackingState | null;
  leftShoulderRaise: number;
  rightShoulderRaise: number;
  pelvis: PelvisTrackingState | null;
  leftLeg: LegTrackingState | null;
  rightLeg: LegTrackingState | null;
};

export type FingerBends = [number, number, number];

export type HandTrackingState = {
  detected: boolean;
  thumb: FingerBends;
  index: FingerBends;
  middle: FingerBends;
  ring: FingerBends;
  little: FingerBends;
};

export type HandsTrackingState = {
  left: HandTrackingState | null;
  right: HandTrackingState | null;
};

export type AvatarTrackingFrame = {
  detected: boolean;
  timestamp: number;
  pose: HeadPose | null;
  blendShapes: FaceBlendShapeMap;
  visemes: VisemeWeights;
  expression: FaceExpression;
  body: BodyTrackingState;
  hands: HandsTrackingState;
  voiceLevel: number;
};

export type AvatarFaceTrackingFrame = AvatarTrackingFrame;

export const EMPTY_BLEND_SHAPES: FaceBlendShapeMap = {};
export const EMPTY_VISEMES: VisemeWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

export const EMPTY_BODY: BodyTrackingState = {
  detected: false,
  leftArm: null,
  rightArm: null,
  leftShoulderRaise: 0,
  rightShoulderRaise: 0,
  pelvis: null,
  leftLeg: null,
  rightLeg: null,
};

export const EMPTY_HANDS: HandsTrackingState = { left: null, right: null };

export const EMPTY_TRACKING_FRAME: AvatarTrackingFrame = {
  detected: false,
  timestamp: 0,
  pose: null,
  blendShapes: EMPTY_BLEND_SHAPES,
  visemes: EMPTY_VISEMES,
  expression: { jawOpen: 0, smile: 0, blinkLeft: 0, blinkRight: 0 },
  body: EMPTY_BODY,
  hands: EMPTY_HANDS,
  voiceLevel: 0,
};

export const EMPTY_FACE_TRACKING_FRAME = EMPTY_TRACKING_FRAME;

export type BodyTrackingCapabilities = {
  spine: boolean;
  shoulders: boolean;
  arms: boolean;
  fingers: boolean;
  pelvis: boolean;
  legs: boolean;
  feet: boolean;
  voiceLipSync: boolean;
  aiLipSync: boolean;
  speechLipSync: boolean;
  customVrm: boolean;
  mocapStream: boolean;
  fullBodyIk: boolean;
  hairPhysics: boolean;
  clothPhysics: boolean;
  armIk: boolean;
  mocap: boolean;
};

export const CURRENT_TRACKING_CAPABILITIES: BodyTrackingCapabilities = {
  spine: true,
  shoulders: true,
  arms: true,
  fingers: true,
  pelvis: true,
  legs: true,
  feet: true,
  voiceLipSync: true,
  aiLipSync: true,
  speechLipSync: true,
  customVrm: true,
  mocapStream: true,
  fullBodyIk: true,
  hairPhysics: true,
  clothPhysics: true,
  armIk: true,
  mocap: true,
};
