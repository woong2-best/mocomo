import * as THREE from "three";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { landmarkPt } from "@/lib/face-filters/face-coords";

export type HeadPose = {
  /** 좌우 (rad) */
  yaw: number;
  /** 상하 (rad) */
  pitch: number;
  /** 기울임 (rad) */
  roll: number;
  scale: number;
  /** 얼굴 중심 이동 (m) — MediaPipe 변환 행렬 */
  tx?: number;
  ty?: number;
  tz?: number;
};

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");

/** 4×4 얼굴 변환 행렬 → yaw/pitch/roll + 위치 (sub-degree 정밀도) */
export function headPoseFromFacialMatrix(result: FaceLandmarkerResult): HeadPose | null {
  const data = result.facialTransformationMatrixes?.[0]?.data;
  if (!data || data.length < 16) return null;

  _matrix.fromArray(data);
  _matrix.decompose(_position, _quaternion, _scale);
  _euler.setFromQuaternion(_quaternion);

  return {
    yaw: _euler.y,
    pitch: _euler.x,
    roll: _euler.z,
    scale: Math.max(0.15, Math.min((_scale.x + _scale.y) / 2, 0.65)),
    tx: _position.x,
    ty: _position.y,
    tz: _position.z,
  };
}

/** 랜드마크 기반 보조 추정 (행렬 없을 때) */
export function headPoseFromLandmarks(
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number
): HeadPose | null {
  const face = result?.faceLandmarks?.[0];
  if (!face) return null;

  const pt = (i: number) => {
    const p = landmarkPt(result, i, w, h);
    return p ?? { x: 0, y: 0 };
  };

  const leftEye = pt(33);
  const rightEye = pt(263);
  const nose = pt(1);
  const chin = pt(152);
  const forehead = pt(10);

  const eyeMid = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };
  const eyeDx = rightEye.x - leftEye.x;
  const eyeDy = rightEye.y - leftEye.y;
  const roll = Math.atan2(eyeDy, eyeDx);

  const faceW = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) * 2.4;
  const yaw = faceW > 1 ? ((nose.x - eyeMid.x) / faceW) * 1.4 : 0;
  const pitch =
    forehead && chin
      ? ((nose.y - eyeMid.y) / Math.max(1, Math.abs(chin.y - forehead.y))) * 0.9
      : 0;

  return {
    yaw,
    pitch,
    roll,
    scale: Math.max(0.15, Math.min(faceW / w, 0.65)),
    tx: 0,
    ty: 0,
    tz: 0,
  };
}

/** 행렬 우선, 실패 시 랜드마크 */
export function estimateHeadPose(
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number
): HeadPose | null {
  if (!result) return null;
  return headPoseFromFacialMatrix(result) ?? headPoseFromLandmarks(result, w, h);
}
