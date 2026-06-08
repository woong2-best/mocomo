/** WebGL 캔버스 → WebM 녹화 */
export class AvatarCanvasRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  isRecording() {
    return this.recorder?.state === "recording";
  }

  start(canvas: HTMLCanvasElement, fps = 30): boolean {
    this.cleanup();
    try {
      this.stream = canvas.captureStream(fps);
      const mime = pickMime();
      this.recorder = new MediaRecorder(this.stream, { mimeType: mime });
      this.chunks = [];
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      this.recorder.start(250);
      return true;
    } catch {
      this.cleanup();
      return false;
    }
  }

  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") {
        this.cleanup();
        resolve(null);
        return;
      }
      this.recorder.onstop = () => {
        const blob = this.chunks.length
          ? new Blob(this.chunks, { type: this.recorder?.mimeType ?? "video/webm" })
          : null;
        this.cleanup();
        resolve(blob);
      };
      this.recorder.stop();
    });
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}

function pickMime(): string {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "video/webm";
}
