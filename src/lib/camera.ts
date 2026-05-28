export type CameraCheckResult = {
  ok: boolean;
  status: "granted" | "denied" | "unavailable" | "unknown";
  deviceLabel?: string;
  message?: string;
};

export async function probeCameraPermission(): Promise<PermissionState | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
  try {
    const result = await navigator.permissions.query({ name: "camera" as PermissionName });
    return result.state;
  } catch {
    return "unknown";
  }
}

/** 이미 허용된 경우 getUserMedia 생략 */
export async function quickCameraCheck(): Promise<CameraCheckResult> {
  const perm = await probeCameraPermission();
  if (perm === "granted") {
    return { ok: true, status: "granted", deviceLabel: "카메라 준비됨" };
  }
  return ensureCameraAccess();
}

/** 영상 통화 전 카메라 권한·연결 확인 (스트림 즉시 해제) */
export async function ensureCameraAccess(): Promise<CameraCheckResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      status: "unavailable",
      message: "이 환경에서는 카메라를 사용할 수 없습니다.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    const deviceLabel = track?.label?.trim() || "연결된 카메라";
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, status: "granted", deviceLabel };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        ok: false,
        status: "denied",
        message: "카메라 권한이 필요합니다. 브라우저 주소창 옆 🔒에서 카메라를 허용해 주세요.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        ok: false,
        status: "unavailable",
        message: "카메라를 찾을 수 없습니다. 기기에 카메라가 있는지 확인해 주세요.",
      };
    }
    return {
      ok: false,
      status: "unavailable",
      message: "카메라를 사용할 수 없습니다. 다른 앱이 카메라를 쓰고 있지 않은지 확인해 주세요.",
    };
  }
}
