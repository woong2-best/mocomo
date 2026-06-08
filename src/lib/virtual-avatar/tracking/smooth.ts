import type {
  BodyTrackingState,
  LegTrackingState,
  PelvisTrackingState,
  VisemeWeights,
} from "@/lib/virtual-avatar/tracking/types";
import type { AvatarTrackingFrame } from "@/lib/virtual-avatar/tracking/types";

type THREELikeRot = { x: number; y: number; z: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRot(a: THREELikeRot, b: THREELikeRot, t: number): THREELikeRot {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}

const defaultRot = (): THREELikeRot => ({ x: 0, y: 0, z: 0 });
const defaultPelvis = (): PelvisTrackingState => ({
  rotationY: 0,
  shiftX: 0,
  shiftY: 0,
  shiftZ: 0,
  leanX: 0,
});

export class TrackingSmoother {
  private headInitialized = false;
  private head: import("@/lib/face-filters/head-pose").HeadPose = {
    yaw: 0,
    pitch: 0,
    roll: 0,
    scale: 0.4,
    tx: 0,
    ty: 0,
    tz: 0,
  };
  private blends = new Map<string, number>();
  private leftArm = { upper: defaultRot(), lower: defaultRot(), hand: defaultRot() };
  private rightArm = { upper: defaultRot(), lower: defaultRot(), hand: defaultRot() };
  private leftLeg = { upper: defaultRot(), lower: defaultRot(), foot: defaultRot() };
  private rightLeg = { upper: defaultRot(), lower: defaultRot(), foot: defaultRot() };
  private pelvis = defaultPelvis();
  private leftShoulder = 0;
  private rightShoulder = 0;
  private handAngles = new Map<string, number>();

  smoothHead(
    target: import("@/lib/face-filters/head-pose").HeadPose,
    dt: number
  ): import("@/lib/face-filters/head-pose").HeadPose {
    const t = Math.min(1, dt * 18);
    if (!this.headInitialized) {
      this.head = { ...target };
      this.headInitialized = true;
      return { ...this.head };
    }
    this.head = {
      yaw: lerp(this.head.yaw, target.yaw, t),
      pitch: lerp(this.head.pitch, target.pitch, t),
      roll: lerp(this.head.roll, target.roll, t),
      scale: lerp(this.head.scale, target.scale, t),
      tx: lerp(this.head.tx ?? 0, target.tx ?? 0, t),
      ty: lerp(this.head.ty ?? 0, target.ty ?? 0, t),
      tz: lerp(this.head.tz ?? 0, target.tz ?? 0, t),
    };
    return { ...this.head };
  }

  smoothBlendShapes(target: Record<string, number>, dt: number): Record<string, number> {
    const t = Math.min(1, dt * 22);
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(target)) {
      const prev = this.blends.get(key) ?? value;
      const next = lerp(prev, value, t);
      this.blends.set(key, next);
      out[key] = next;
    }
    return out;
  }

  private smoothLeg(prev: typeof this.leftLeg, next: LegTrackingState, t: number) {
    return {
      upper: lerpRot(prev.upper, next.upper, t),
      lower: lerpRot(prev.lower, next.lower, t),
      foot: lerpRot(prev.foot, next.foot, t),
    };
  }

  smoothBody(target: BodyTrackingState, dt: number): BodyTrackingState {
    if (!target.detected) return target;
    const t = Math.min(1, dt * 16);

    if (target.leftArm) {
      this.leftArm.upper = lerpRot(this.leftArm.upper, target.leftArm.upper, t);
      this.leftArm.lower = lerpRot(this.leftArm.lower, target.leftArm.lower, t);
      this.leftArm.hand = lerpRot(this.leftArm.hand, target.leftArm.hand, t);
    }
    if (target.rightArm) {
      this.rightArm.upper = lerpRot(this.rightArm.upper, target.rightArm.upper, t);
      this.rightArm.lower = lerpRot(this.rightArm.lower, target.rightArm.lower, t);
      this.rightArm.hand = lerpRot(this.rightArm.hand, target.rightArm.hand, t);
    }
    if (target.leftLeg) this.leftLeg = this.smoothLeg(this.leftLeg, target.leftLeg, t);
    if (target.rightLeg) this.rightLeg = this.smoothLeg(this.rightLeg, target.rightLeg, t);
    if (target.pelvis) {
      this.pelvis = {
        rotationY: lerp(this.pelvis.rotationY, target.pelvis.rotationY, t),
        shiftX: lerp(this.pelvis.shiftX, target.pelvis.shiftX, t),
        shiftY: lerp(this.pelvis.shiftY, target.pelvis.shiftY, t),
        shiftZ: lerp(this.pelvis.shiftZ, target.pelvis.shiftZ, t),
        leanX: lerp(this.pelvis.leanX, target.pelvis.leanX, t),
      };
    }

    this.leftShoulder = lerp(this.leftShoulder, target.leftShoulderRaise, t);
    this.rightShoulder = lerp(this.rightShoulder, target.rightShoulderRaise, t);

    return {
      detected: true,
      leftArm: target.leftArm ? { ...this.leftArm } : null,
      rightArm: target.rightArm ? { ...this.rightArm } : null,
      leftShoulderRaise: this.leftShoulder,
      rightShoulderRaise: this.rightShoulder,
      pelvis: target.pelvis ? { ...this.pelvis } : null,
      leftLeg: target.leftLeg ? { ...this.leftLeg } : null,
      rightLeg: target.rightLeg ? { ...this.rightLeg } : null,
    };
  }

  smoothHandAngle(key: string, target: number, dt: number): number {
    const t = Math.min(1, dt * 20);
    const prev = this.handAngles.get(key) ?? target;
    const next = lerp(prev, target, t);
    this.handAngles.set(key, next);
    return next;
  }

  reset() {
    this.headInitialized = false;
    this.blends.clear();
    this.handAngles.clear();
    this.head = { yaw: 0, pitch: 0, roll: 0, scale: 0.4, tx: 0, ty: 0, tz: 0 };
    this.leftArm = { upper: defaultRot(), lower: defaultRot(), hand: defaultRot() };
    this.rightArm = { upper: defaultRot(), lower: defaultRot(), hand: defaultRot() };
    this.leftLeg = { upper: defaultRot(), lower: defaultRot(), foot: defaultRot() };
    this.rightLeg = { upper: defaultRot(), lower: defaultRot(), foot: defaultRot() };
    this.pelvis = defaultPelvis();
    this.leftShoulder = 0;
    this.rightShoulder = 0;
  }
}

export function mergeVisemes(
  face: VisemeWeights,
  voice: VisemeWeights | null,
  voiceLevel: number
): VisemeWeights {
  if (!voice || voiceLevel < 0.04) return face;
  const w = Math.min(0.72, voiceLevel * 1.35);
  return {
    aa: lerp(face.aa, voice.aa, w),
    ih: lerp(face.ih, voice.ih, w),
    ou: lerp(face.ou, voice.ou, w),
    ee: lerp(face.ee, voice.ee, w),
    oh: lerp(face.oh, voice.oh, w),
  };
}

export function composeTrackingFrame(
  partial: Omit<AvatarTrackingFrame, "visemes"> & { visemes?: VisemeWeights },
  voiceVisemes: VisemeWeights | null,
  voiceLevel: number
): AvatarTrackingFrame {
  const faceVisemes = partial.visemes ?? { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  return {
    ...partial,
    visemes: mergeVisemes(faceVisemes, voiceVisemes, voiceLevel),
  };
}
