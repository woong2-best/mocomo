function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "video/webm";
}

/** 브라우저에서 구간 자르기 (짧은 클립·게시용) */
export async function trimVideoBlob(
  blob: Blob,
  startSec: number,
  endSec: number,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("영상 메타데이터를 읽을 수 없습니다."));
  });

  const duration = video.duration;
  const start = Math.max(0, Math.min(startSec, duration - 0.1));
  const end = Math.max(start + 0.1, Math.min(endSec, duration));
  const clipLen = end - start;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Canvas를 사용할 수 없습니다.");
  }

  const mimeType = pickRecorderMime();
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상 인코딩에 실패했습니다."));
    };
    recorder.onstop = () => {
      URL.revokeObjectURL(url);
      video.pause();
      resolve(new Blob(chunks, { type: mimeType }));
    };

    recorder.start(200);
    video.currentTime = start;

    const onSeeked = async () => {
      video.removeEventListener("seeked", onSeeked);
      try {
        await video.play();
      } catch {
        /* autoplay blocked — still draw frames while playing attempt */
      }

      const started = performance.now();

      const tick = () => {
        if (video.currentTime >= end || video.ended) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          onProgress?.(1);
          video.pause();
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const ratio = Math.min(1, (video.currentTime - start) / clipLen);
        onProgress?.(ratio);
        if (performance.now() - started > clipLen * 1000 + 8000) {
          video.pause();
          recorder.stop();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    video.addEventListener("seeked", onSeeked);
  });
}
