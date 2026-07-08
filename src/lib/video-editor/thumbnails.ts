/** 타임라인 필름스트립용 썸네일 생성 */
export async function generateVideoThumbnails(
  video: HTMLVideoElement,
  duration: number,
  count = 12
): Promise<string[]> {
  if (!duration || !Number.isFinite(duration)) return [];

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw < 2 || vh < 2) return [];

  const thumbH = 48;
  const thumbW = Math.max(28, Math.round((vw / vh) * thumbH));
  const canvas = document.createElement("canvas");
  canvas.width = thumbW;
  canvas.height = thumbH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const saved = video.currentTime;
  const wasPaused = video.paused;
  const urls: string[] = [];
  const n = Math.max(1, Math.min(count, Math.ceil(duration)));

  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * Math.max(0, duration - 0.05);
    await seekVideo(video, t);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, thumbW, thumbH);
    ctx.drawImage(video, 0, 0, thumbW, thumbH);
    urls.push(canvas.toDataURL("image/jpeg", 0.55));
  }

  await seekVideo(video, saved);
  if (!wasPaused) void video.play().catch(() => undefined);

  return urls;
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

export function formatVideoTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
