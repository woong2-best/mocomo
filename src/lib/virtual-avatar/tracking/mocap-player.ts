import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { VRMHumanBoneName } from "@pixiv/three-vrm-core";
import { mapMocapBone } from "@/lib/virtual-avatar/tracking/mocap-bone-map";
import { MocapStreamClient, type MocapStreamFrame } from "@/lib/virtual-avatar/tracking/mocap-stream";

export type MocapPreset = "idle" | "wave" | "bow" | "walk";

export class VrmMocapPlayer {
  private mixer: THREE.AnimationMixer | null = null;
  private action: THREE.AnimationAction | null = null;
  private preset: MocapPreset | null = null;
  private presetPhase = 0;
  private playing = false;
  private stream = new MocapStreamClient();
  private streamFrame: MocapStreamFrame | null = null;

  isPlaying() {
    return this.playing;
  }

  isStreamConnected() {
    return this.stream.isConnected();
  }

  stop(vrm: VRM) {
    this.playing = false;
    this.preset = null;
    this.streamFrame = null;
    this.stream.disconnect();
    this.action?.stop();
    this.mixer?.stopAllAction();
    this.resetPose(vrm);
  }

  playPreset(vrm: VRM, preset: MocapPreset) {
    this.stop(vrm);
    this.preset = preset;
    this.presetPhase = 0;
    this.playing = true;
  }

  async connectStream(vrm: VRM, url: string): Promise<boolean> {
    this.stop(vrm);
    const ok = await this.stream.connect(url);
    if (!ok) return false;
    this.stream.poll((frame) => {
      this.streamFrame = frame;
    });
    this.playing = true;
    return true;
  }

  async loadBvhFile(vrm: VRM, file: File): Promise<boolean> {
    try {
      const text = await file.text();
      return this.loadBvhText(vrm, text);
    } catch {
      return false;
    }
  }

  async loadBvhText(vrm: VRM, text: string): Promise<boolean> {
    try {
      const { BVHLoader } = await import("three/addons/loaders/BVHLoader.js");
      const loader = new BVHLoader();
      const result = loader.parse(text);
      return this.applyClip(vrm, result.clip);
    } catch {
      return false;
    }
  }

  async loadFbxFile(vrm: VRM, file: File): Promise<boolean> {
    try {
      const { FBXLoader } = await import("three/addons/loaders/FBXLoader.js");
      const buf = await file.arrayBuffer();
      const loader = new FBXLoader();
      const fbx = loader.parse(buf, "");
      const clips = fbx.animations;
      if (!clips.length) return false;
      return this.applyClip(vrm, clips[0]);
    } catch {
      return false;
    }
  }

  private applyClip(vrm: VRM, clip: THREE.AnimationClip): boolean {
    const tracks: THREE.KeyframeTrack[] = [];
    const boneNodes = new Map<VRMHumanBoneName, THREE.Object3D>();

    for (const track of clip.tracks) {
      const rawBone = track.name.split(".")[0];
      const vrmBone = mapMocapBone(rawBone);
      if (!vrmBone) continue;

      let node = boneNodes.get(vrmBone);
      if (!node) {
        node = vrm.humanoid?.getNormalizedBoneNode(vrmBone) ?? undefined;
        if (!node) continue;
        boneNodes.set(vrmBone, node);
      }

      if (track instanceof THREE.QuaternionKeyframeTrack) {
        tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, track.times, track.values));
      } else if (track instanceof THREE.VectorKeyframeTrack && track.name.includes("position")) {
        tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.position`, track.times, track.values));
      }
    }

    if (!tracks.length) return false;

    this.mixer?.stopAllAction();
    this.mixer = new THREE.AnimationMixer(vrm.scene);
    const vrmClip = new THREE.AnimationClip(clip.name || "mocap", clip.duration, tracks);
    this.action = this.mixer.clipAction(vrmClip);
    this.action.setLoop(THREE.LoopRepeat, Infinity);
    this.action.play();
    this.preset = null;
    this.streamFrame = null;
    this.playing = true;
    return true;
  }

  update(vrm: VRM, dt: number) {
    if (!this.playing) return;

    if (this.streamFrame) {
      this.stream.applyFrame(vrm, this.streamFrame);
      return;
    }

    if (this.mixer && this.action) {
      this.mixer.update(dt);
      return;
    }

    if (this.preset) this.tickPreset(vrm, dt);
  }

  private tickPreset(vrm: VRM, dt: number) {
    this.presetPhase += dt;
    const t = this.presetPhase;
    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    const set = (bone: VRMHumanBoneName, x: number, y: number, z: number) => {
      const n = humanoid.getNormalizedBoneNode(bone);
      if (!n) return;
      n.rotation.x = THREE.MathUtils.lerp(n.rotation.x, x, 0.18);
      n.rotation.y = THREE.MathUtils.lerp(n.rotation.y, y, 0.18);
      n.rotation.z = THREE.MathUtils.lerp(n.rotation.z, z, 0.18);
    };

    switch (this.preset) {
      case "wave":
        set("rightUpperArm", 0.2, 0, -1.2 + Math.sin(t * 5) * 0.45);
        set("rightLowerArm", 0, 0, -0.5);
        break;
      case "bow":
        set("spine", 0.35 + Math.sin(t * 2) * 0.05, 0, 0);
        set("neck", 0.15, 0, 0);
        break;
      case "walk":
        set("leftUpperLeg", 0, 0, Math.sin(t * 4) * 0.35);
        set("rightUpperLeg", 0, 0, -Math.sin(t * 4) * 0.35);
        set("leftLowerLeg", 0, 0, Math.max(0, Math.sin(t * 4)) * 0.5);
        set("rightLowerLeg", 0, 0, Math.max(0, -Math.sin(t * 4)) * 0.5);
        break;
      default:
        set("spine", Math.sin(t * 1.5) * 0.02, 0, 0);
        set("hips", 0, Math.sin(t * 1.2) * 0.03, 0);
    }
  }

  private resetPose(vrm: VRM) {
    const bones: VRMHumanBoneName[] = [
      "hips",
      "spine",
      "chest",
      "upperChest",
      "neck",
      "head",
      "leftUpperArm",
      "leftLowerArm",
      "leftHand",
      "rightUpperArm",
      "rightLowerArm",
      "rightHand",
      "leftUpperLeg",
      "rightUpperLeg",
      "leftLowerLeg",
      "rightLowerLeg",
      "leftFoot",
      "rightFoot",
    ];
    for (const b of bones) {
      const n = vrm.humanoid?.getNormalizedBoneNode(b);
      if (n) n.rotation.set(0, 0, 0);
    }
  }
}
