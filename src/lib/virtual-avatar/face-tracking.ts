import type { VRM } from "@pixiv/three-vrm";
import type { AvatarTrackingFrame } from "@/lib/virtual-avatar/tracking/types";

export type {
  AvatarFaceTrackingFrame,
  AvatarTrackingFrame,
  BodyTrackingCapabilities,
  FaceBlendShapeMap,
  VisemeWeights,
} from "@/lib/virtual-avatar/tracking/types";

export {
  EMPTY_BODY,
  EMPTY_FACE_TRACKING_FRAME,
  EMPTY_HANDS,
  EMPTY_TRACKING_FRAME,
  CURRENT_TRACKING_CAPABILITIES,
} from "@/lib/virtual-avatar/tracking/types";

export { TrackingSmoother, composeTrackingFrame, mergeVisemes } from "@/lib/virtual-avatar/tracking/smooth";
export { extractTrackingFrame, computeVisemes } from "@/lib/virtual-avatar/tracking/extract-mediapipe";
export { extractBodyPose } from "@/lib/virtual-avatar/tracking/extract-pose";
export { extractHands } from "@/lib/virtual-avatar/tracking/extract-hands";
export { preloadBodyLandmarkers, getPoseLandmarker, getHandLandmarker } from "@/lib/virtual-avatar/tracking/landmarkers";
export { VoiceLipSync } from "@/lib/virtual-avatar/tracking/voice-lipsync";
export { AiLipSync, textToVisemes } from "@/lib/virtual-avatar/tracking/ai-lipsync";
export { SpeechLipSync } from "@/lib/virtual-avatar/tracking/speech-lipsync";
export { MocapStreamClient } from "@/lib/virtual-avatar/tracking/mocap-stream";
export { saveCustomVrm, loadCustomVrm, clearCustomVrm } from "@/lib/virtual-avatar/vrm-storage";
export {
  saveVrmSlot,
  loadVrmSlot,
  listVrmSlots,
  deleteVrmSlot,
  loadActiveVrm,
  setActiveVrmSlotId,
  getActiveVrmSlotId,
  clearAllVrmSlots,
  type VrmSlotMeta,
} from "@/lib/virtual-avatar/vrm-storage";
export { exportPresetBlob, importPresetFile, downloadBlob } from "@/lib/virtual-avatar/avatar-export";
export { AvatarCanvasRecorder } from "@/lib/virtual-avatar/avatar-recorder";
export {
  TrackingTimelineRecorder,
  TrackingTimelinePlayer,
} from "@/lib/virtual-avatar/tracking/tracking-timeline";
export { applyFootPlanting, applyLookAtCamera } from "@/lib/virtual-avatar/tracking/full-body-ik";
export { VrmMocapPlayer, type MocapPreset } from "@/lib/virtual-avatar/tracking/mocap-player";
export { solveArmCcd } from "@/lib/virtual-avatar/tracking/ccd-arm-ik";
export {
  initSpringPhysics,
  tickSpringPhysics,
  resetSpringPhysics,
  tickSpringPhysics as tickHairSpringPhysics,
  resetSpringPhysics as resetSpringTune,
} from "@/lib/virtual-avatar/tracking/spring-physics";
export { applyArkitFaceMorphs, ARKIT_FACE_MORPH_MAP } from "@/lib/virtual-avatar/tracking/arkit-morph-map";
export {
  applyTrackingRig,
  applyTrackingFaceMorphs,
  resetTrackingRig,
} from "@/lib/virtual-avatar/tracking/vrm-driver";
export { applyBodyTracking, resetBodyTracking } from "@/lib/virtual-avatar/tracking/body-driver";
export { solveArmIk } from "@/lib/virtual-avatar/tracking/arm-ik";

import { applyTrackingRig, resetTrackingRig } from "@/lib/virtual-avatar/tracking/vrm-driver";

export function applyFaceTrackingToVrm(vrm: VRM, frame: AvatarTrackingFrame) {
  applyTrackingRig(vrm, frame);
}

export function resetAvatarFacing(vrm: VRM) {
  resetTrackingRig(vrm);
}
