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
    return { ok: true, status: "granted", deviceLabel: "Camera ready" };
  }
  return ensureCameraAccess();
}

/** Video 통화 전 카메라 권한·연결 확인 (스트림 즉시 해제) */
export async function ensureCameraAccess(): Promise<CameraCheckResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      status: "unavailable",
      message: "Camera isn't available in this environment.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    const deviceLabel = track?.label?.trim() || "Connected camera";
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, status: "granted", deviceLabel };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        ok: false,
        status: "denied",
        message: "Camera permission required. Allow camera access from the lock icon next to the address bar.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        ok: false,
        status: "unavailable",
        message: "No camera found. Check that your device has a camera.",
      };
    }
    return {
      ok: false,
      status: "unavailable",
      message: "Camera unavailable. Make sure another app isn't using it.",
    };
  }
}
