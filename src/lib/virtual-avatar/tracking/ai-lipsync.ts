import type { VisemeWeights } from "@/lib/virtual-avatar/tracking/types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Whisper 텍스트 → 5모음 viseme (한·영) */
export function textToVisemes(text: string): VisemeWeights {
  const t = text.toLowerCase();
  let aa = 0;
  let ih = 0;
  let ou = 0;
  let ee = 0;
  let oh = 0;

  for (const ch of t) {
    if ("aáàâãäåㅏㅑㅓㅕ".includes(ch)) aa += 1;
    else if ("eéèêëiíìîïㅣㅐㅔㅖ".includes(ch)) ee += 1;
    else if ("oóòôõöuúùûüㅗㅜㅛㅠ".includes(ch)) ou += 1;
    else if ("yㅡ".includes(ch)) ih += 1;
    else if ("hㅎ".includes(ch)) oh += 0.5;
    else if ("mnbㅁㅂㅍ".includes(ch)) oh += 0.35;
    else if ("fvㅂㅍ".includes(ch)) ee += 0.3;
  }

  const total = aa + ih + ou + ee + oh || 1;
  return {
    aa: clamp01(aa / total),
    ih: clamp01(ih / total),
    ou: clamp01(ou / total),
    ee: clamp01(ee / total),
    oh: clamp01(oh / total),
  };
}

/** 마이크 청크 → /api/avatar/phonemes → AI 립싱크 */
export class AiLipSync {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private pending = false;
  private lastFetch = 0;
  private visemes: VisemeWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  private active = false;
  private stream: MediaStream | null = null;

  async attach(stream: MediaStream): Promise<boolean> {
    this.detach();
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return false;

    try {
      this.stream = new MediaStream(audioTracks);
      this.recorder = new MediaRecorder(this.stream, { mimeType: this.pickMime() });
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      this.recorder.start(600);
      this.active = true;
      return true;
    } catch {
      this.detach();
      return false;
    }
  }

  detach() {
    try {
      this.recorder?.stop();
    } catch {
      /* noop */
    }
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.pending = false;
    this.active = false;
    this.visemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  }

  isActive() {
    return this.active;
  }

  /** 프레임마다 호출 — voiceLevel 높을 때 주기적으로 API 요청 */
  async tick(voiceLevel: number): Promise<VisemeWeights | null> {
    if (!this.active || voiceLevel < 0.08) return null;
    const now = performance.now();
    if (this.pending || now - this.lastFetch < 1200) return this.visemes;

    this.pending = true;
    this.lastFetch = now;

    try {
      if (this.chunks.length === 0) return this.visemes;
      const blob = new Blob(this.chunks, { type: this.recorder?.mimeType ?? "audio/webm" });
      this.chunks = [];

      const fd = new FormData();
      fd.append("audio", blob, "speech.webm");

      const res = await fetch("/api/avatar/phonemes", { method: "POST", body: fd });
      if (!res.ok) return this.visemes;

      const data = (await res.json()) as { visemes?: VisemeWeights | null };
      if (data.visemes) {
        this.visemes = data.visemes;
        return this.visemes;
      }
    } catch {
      /* skip */
    } finally {
      this.pending = false;
    }
    return this.visemes;
  }

  getVisemes(): VisemeWeights {
    return this.visemes;
  }

  private pickMime(): string {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "audio/webm";
  }
}
