import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { HeadPose } from "@/lib/face-filters/head-pose";

type SpringJoint = {
  bone?: { name?: string };
  settings?: {
    stiffness?: number;
    dragForce?: number;
    gravityPower?: number;
    gravityDir?: THREE.Vector3;
  };
};

type SpringManager = {
  joints?: SpringJoint[];
  reset?: () => void;
};

const tuned = new WeakSet<VRM>();
const prevHead = new WeakMap<VRM, HeadPose>();

function classifySpring(name: string): "hair" | "cloth" | "chest" | "other" {
  const n = name.toLowerCase();
  if (n.includes("hair")) return "hair";
  if (n.includes("tops") || n.includes("skirt") || n.includes("coat") || n.includes("ribbon")) return "cloth";
  if (n.includes("chest") || n.includes("breast")) return "chest";
  return "other";
}

export function initSpringPhysics(vrm: VRM) {
  if (tuned.has(vrm)) return;
  const mgr = vrm.springBoneManager as SpringManager | undefined;
  if (!mgr?.joints) return;

  for (const joint of mgr.joints) {
    const name = joint.bone?.name ?? "";
    const kind = classifySpring(name);
    const s = joint.settings;
    if (!s) continue;

    switch (kind) {
      case "hair":
        s.stiffness = 0.42;
        s.dragForce = 0.38;
        s.gravityPower = 0.28;
        break;
      case "cloth":
        s.stiffness = 0.28;
        s.dragForce = 0.45;
        s.gravityPower = 0.35;
        break;
      case "chest":
        s.stiffness = 0.22;
        s.dragForce = 0.52;
        s.gravityPower = 0.18;
        break;
      default:
        s.stiffness = 0.35;
        s.dragForce = 0.4;
        s.gravityPower = 0.25;
    }
    if (s.gravityDir) s.gravityDir.set(0, -1, 0);
  }
  tuned.add(vrm);
}

export function tickSpringPhysics(vrm: VRM, head: HeadPose | null, bodyMotion = 0, dt: number) {
  initSpringPhysics(vrm);
  const mgr = vrm.springBoneManager as SpringManager | undefined;
  if (!mgr?.joints || !head) return;

  const prev = prevHead.get(vrm);
  let vel = bodyMotion;
  if (prev) {
    vel += (Math.abs(head.yaw - prev.yaw) + Math.abs(head.pitch - prev.pitch)) / Math.max(dt, 0.001);
  }
  prevHead.set(vrm, { ...head });

  const boost = Math.min(vel * 0.008, 0.15);
  const windX = head.roll * 0.2 + head.yaw * 0.05;

  for (const joint of mgr.joints) {
    const name = joint.bone?.name ?? "";
    const kind = classifySpring(name);
    const s = joint.settings;
    if (!s) continue;

    const base = kind === "hair" ? 0.28 : kind === "cloth" ? 0.35 : kind === "chest" ? 0.2 : 0.25;
    s.gravityPower = THREE.MathUtils.lerp(s.gravityPower ?? base, base + boost, 0.12);

    if (s.gravityDir) {
      s.gravityDir.x = THREE.MathUtils.lerp(s.gravityDir.x, windX, 0.1);
      s.gravityDir.y = THREE.MathUtils.lerp(s.gravityDir.y, -1, 0.05);
    }

    if (kind === "cloth" || kind === "chest") {
      s.stiffness = THREE.MathUtils.lerp(s.stiffness ?? 0.3, 0.48, 0.06);
    }
  }
}

export function resetSpringPhysics(vrm: VRM) {
  prevHead.delete(vrm);
  tuned.delete(vrm);
  vrm.springBoneManager?.reset();
}
