export type MicCheckResult = {
  ok: boolean;
  status: "granted" | "denied" | "unavailable" | "unknown";
  deviceLabel?: string;
  message?: string;
};

export async function probeMicrophonePermission(): Promise<PermissionState | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return result.state;
  } catch {
    return "unknown";
  }
}

/** 이미 허용된 경우 getUserMedia 생략 — 통화 시작 속도 */
export async function quickMicrophoneCheck(): Promise<MicCheckResult> {
  const perm = await probeMicrophonePermission();
  if (perm === "granted") {
    return { ok: true, status: "granted", deviceLabel: "Microphone ready" };
  }
  return ensureMicrophoneAccess();
}

/** 통화 전 마이크 권한·연결 확인 (스트림 즉시 해제) */
export async function ensureMicrophoneAccess(): Promise<MicCheckResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      status: "unavailable",
      message: "Microphone isn't available in this environment.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: { ideal: 48_000 },
      },
    });
    const track = stream.getAudioTracks()[0];
    const deviceLabel = track?.label?.trim() || "Connected microphone";
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, status: "granted", deviceLabel };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        ok: false,
        status: "denied",
        message: "Microphone permission required. Allow the mic from the lock icon next to the address bar.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        ok: false,
        status: "unavailable",
        message: "No microphone detected. Check your headset or earphones.",
      };
    }
    return {
      ok: false,
      status: "unavailable",
      message: "Can't use the microphone. Make sure another app isn't using it.",
    };
  }
}
