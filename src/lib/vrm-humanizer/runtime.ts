import type { Object3D } from "three";
import type { VRM } from "@pixiv/three-vrm";
import { CharacterFSM } from "@/lib/vrm-humanizer/CharacterFSM";
import { resolveCharacterConfig, type CharacterConfig } from "@/lib/vrm-humanizer/CharacterConfigs";
import { resolveFsmState, shouldBoostSaccade, type FsmState } from "@/lib/vrm-humanizer/math";
import { createContinuousNoise } from "@/lib/vrm-humanizer/noise";
import { ReflexController } from "@/lib/vrm-humanizer/ReflexController";
import { SaccadeSystem } from "@/lib/vrm-humanizer/SaccadeSystem";
import { VRMHumanizer } from "@/lib/vrm-humanizer/VRMHumanizer";

export type HumanizerFace = {
  blink: number;
  joy: number;
};

/**
 * One object for the render loop. Layers run in the spec order:
 * FSM mixer → posture/weight/breath → saccade → (caller `vrm.update`) → reflex.
 */
export class VrmHumanizerRuntime {
  characterId: string;
  readonly humanizer: VRMHumanizer;
  readonly saccade: SaccadeSystem;
  readonly fsm: CharacterFSM;
  readonly reflex: ReflexController;
  private speaking = false;
  private thinking = false;

  private constructor(config: CharacterConfig) {
    const noise = createContinuousNoise();
    this.characterId = config.id;
    this.humanizer = new VRMHumanizer(config, noise);
    this.saccade = new SaccadeSystem(config, noise);
    this.fsm = new CharacterFSM(config);
    this.reflex = new ReflexController(config, noise);
  }

  static attach(vrm: VRM, characterId: string | null | undefined, camera: Object3D): VrmHumanizerRuntime {
    const config = resolveCharacterConfig(characterId);
    const runtime = new VrmHumanizerRuntime(config);
    runtime.humanizer.attach(vrm);
    runtime.fsm.attach(vrm);
    runtime.reflex.attach(vrm);
    runtime.saccade.attach(vrm, vrm.scene.parent ?? vrm.scene, camera);
    runtime.saccade.bindLookAt();
    return runtime;
  }

  setCharacter(characterId: string | null | undefined) {
    const config = resolveCharacterConfig(characterId);
    if (config.id === this.characterId) return;
    this.characterId = config.id;
    this.humanizer.setConfig(config);
    this.saccade.setConfig(config);
    this.fsm.setConfig(config);
    this.reflex.setConfig(config);
  }

  setThinking(thinking: boolean) {
    this.thinking = thinking;
    this.syncState();
  }

  setSpeaking(speaking: boolean) {
    this.speaking = speaking;
    this.syncState();
  }

  setRms(rms: number) {
    this.reflex.setRms(rms);
    this.humanizer.setRms(rms);
  }

  setReducedMotion(reduced: boolean) {
    this.humanizer.setReducedMotion(reduced);
    this.saccade.setReducedMotion(reduced);
    this.reflex.setReducedMotion(reduced);
  }

  notifySpeech(text?: string | null, emotion?: string | null) {
    if (shouldBoostSaccade(text, emotion)) this.saccade.boostSaccade(2.8, 2.6);
  }

  getState(): FsmState {
    return this.fsm.getState();
  }

  beforeVrmUpdate(delta: number, camera: Object3D) {
    this.syncState();
    this.humanizer.setAmplitudeScale(this.reflex.amplitudeScale());
    this.fsm.update(delta);
    this.humanizer.update(delta);
    const habit = this.humanizer.consumeHabitTrigger();
    if (habit && !this.fsm.playHabit(habit)) this.humanizer.startHabit(habit);
    this.saccade.setCheckingPhone(this.humanizer.isCheckingPhone());
    this.saccade.update(delta, camera);
  }

  afterVrmUpdate(delta: number): HumanizerFace {
    this.humanizer.updateHands(delta);
    const reflex = this.reflex.update(delta);
    return { blink: reflex.blink, joy: this.humanizer.checkPhoneJoy() };
  }

  dispose() {
    this.humanizer.dispose();
    this.saccade.dispose();
    this.fsm.dispose();
    this.reflex.dispose();
  }

  private syncState() {
    const state = resolveFsmState(this.speaking, this.thinking);
    this.fsm.setState(state);
    this.humanizer.setState(state);
    this.saccade.setThinking(state === "thinking");
    this.reflex.setThinking(state === "thinking");
  }
}
