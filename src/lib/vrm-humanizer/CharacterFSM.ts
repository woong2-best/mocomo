import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { CharacterConfig, HabitName } from "@/lib/vrm-humanizer/CharacterConfigs";
import type { FsmState } from "@/lib/vrm-humanizer/math";

type ClipName = FsmState | HabitName;

function clipList(vrm: VRM): THREE.AnimationClip[] {
  const extra = vrm.scene.userData.mocoClips;
  return Array.isArray(extra) ? (extra as THREE.AnimationClip[]) : [];
}

function findClip(clips: THREE.AnimationClip[], name: string | undefined): THREE.AnimationClip | null {
  if (!name) return null;
  const key = name.toLowerCase();
  return (
    clips.find((clip) => clip.name.toLowerCase() === key) ??
    clips.find((clip) => clip.name.toLowerCase().includes(key)) ??
    null
  );
}

/**
 * Idle / thinking / speaking plus optional GLTF clip crossfades.
 * Missing clips are a no-op so procedural layers still run.
 */
export class CharacterFSM {
  private vrm: VRM | null = null;
  private config: CharacterConfig;
  private mixer: THREE.AnimationMixer | null = null;
  private current: THREE.AnimationAction | null = null;
  private state: FsmState = "idle";
  private clips: THREE.AnimationClip[] = [];

  constructor(config: CharacterConfig) {
    this.config = config;
  }

  attach(vrm: VRM) {
    this.vrm = vrm;
    this.mixer?.stopAllAction();
    this.mixer = new THREE.AnimationMixer(vrm.scene);
    this.clips = clipList(vrm);
    this.current = null;
    this.playState(this.state);
  }

  setConfig(config: CharacterConfig) {
    this.config = config;
    if (this.vrm) this.playState(this.state);
  }

  setState(state: FsmState) {
    if (this.state === state) return;
    this.state = state;
    this.playState(state);
  }

  getState(): FsmState {
    return this.state;
  }

  /** Returns true when a named clip exists and a crossfade started. */
  playHabit(name: HabitName): boolean {
    return this.crossFade(name, 0.28);
  }

  update(delta: number) {
    this.mixer?.update(Math.min(Math.max(delta, 0), 0.08));
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.current = null;
    this.vrm = null;
    this.clips = [];
  }

  private playState(state: FsmState) {
    this.crossFade(state, 0.4);
  }

  private crossFade(name: ClipName, fade: number): boolean {
    if (!this.mixer) return false;
    const clip = findClip(this.clips, this.config.clips[name] ?? name);
    if (!clip) return false;
    const next = this.mixer.clipAction(clip);
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.reset().fadeIn(fade).play();
    this.current?.fadeOut(fade);
    this.current = next;
    return true;
  }
}
