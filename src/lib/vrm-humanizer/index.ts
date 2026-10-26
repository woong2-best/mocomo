export { CHARACTER_CONFIGS, resolveCharacterConfig } from "@/lib/vrm-humanizer/CharacterConfigs";
export type { CharacterConfig, EulerDeg, HabitName, LiveAvatarId } from "@/lib/vrm-humanizer/CharacterConfigs";
export { CharacterFSM } from "@/lib/vrm-humanizer/CharacterFSM";
export { ReflexController } from "@/lib/vrm-humanizer/ReflexController";
export type { ReflexSample } from "@/lib/vrm-humanizer/ReflexController";
export { SaccadeSystem } from "@/lib/vrm-humanizer/SaccadeSystem";
export { VRMHumanizer } from "@/lib/vrm-humanizer/VRMHumanizer";
export { VrmHumanizerRuntime } from "@/lib/vrm-humanizer/runtime";
export type { HumanizerFace } from "@/lib/vrm-humanizer/runtime";
export {
  resolveFsmState,
  rmsAmplitudeScale,
  shouldBoostSaccade,
  type FsmState,
} from "@/lib/vrm-humanizer/math";
