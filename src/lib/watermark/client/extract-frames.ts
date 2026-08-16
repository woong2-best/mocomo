/**
 * Browser-side frame sampling for forensic analysis.
 *
 * The server runtime has no video decoder, so the admin client decodes the
 * leaked file locally and submits still frames. Frames are sent as PNG to avoid
 * a second lossy generation on top of whatever the leak already went through.
 */

export const MAX_ANALYSIS_FRAMES = 12;

async function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Frame encoding failed"))),
      "image/png"
    );
  });
}

export async function extractImageFrame(file: File): Promise<Blob[]> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return [await blobFromCanvas(canvas)];
}

export async function extractVideoFrames(
  file: File,
  frameCount = MAX_ANALYSIS_FRAMES,
  onProgress?: (done: number, total: number) => void
): Promise<Blob[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("This video could not be decoded in the browser"));
    });

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");

    const frames: Blob[] = [];
    for (let i = 0; i < frameCount; i++) {
      // Skip the very start and end, which are often black or a title card.
      const target = duration ? duration * ((i + 0.5) / frameCount) : 0;
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("Seeking failed"));
        video.currentTime = target;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(await blobFromCanvas(canvas));
      onProgress?.(i + 1, frameCount);
      if (!duration) break;
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export async function hashFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
