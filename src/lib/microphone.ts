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
    return { ok: true, status: "granted", deviceLabel: "마이크 준비됨" };
  }
  return ensureMicrophoneAccess();
}

/** 통화 전 마이크 권한·연결 확인 (스트림 즉시 해제) */
export async function ensureMicrophoneAccess(): Promise<MicCheckResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      status: "unavailable",
      message: "이 환경에서는 마이크를 사용할 수 없습니다.",
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
    const deviceLabel = track?.label?.trim() || "연결된 마이크";
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, status: "granted", deviceLabel };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        ok: false,
        status: "denied",
        message: "마이크 권한이 필요합니다. 브라우저 주소창 옆 🔒에서 마이크를 허용해 주세요.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        ok: false,
        status: "unavailable",
        message: "마이크가 연결되어 있지 않습니다. 이어폰·헤드셋을 확인해 주세요.",
      };
    }
    return {
      ok: false,
      status: "unavailable",
      message: "마이크를 사용할 수 없습니다. 다른 앱이 마이크를 쓰고 있지 않은지 확인해 주세요.",
    };
  }
}
