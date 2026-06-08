import type { VisemeWeights } from "@/lib/virtual-avatar/tracking/types";
import { textToVisemes } from "@/lib/virtual-avatar/tracking/ai-lipsync";

const EMPTY: VisemeWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 브라우저 SpeechRecognition → 실시간(저지연) viseme */
export class SpeechLipSync {
  private recognition: SpeechRecognition | null = null;
  private visemes: VisemeWeights = { ...EMPTY };
  private active = false;
  private lastText = "";

  isSupported() {
    return !!getSpeechRecognition();
  }

  isActive() {
    return this.active;
  }

  start(lang = "ko-KR"): boolean {
    this.stop();
    const Ctor = getSpeechRecognition();
    if (!Ctor) return false;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0]?.transcript ?? "";
      }
      if (!text.trim()) return;
      this.lastText = text.slice(-12);
      this.visemes = textToVisemes(this.lastText);
    };

    rec.onend = () => {
      if (this.active) {
        try {
          rec.start();
        } catch {
          /* noop */
        }
      }
    };

    try {
      rec.start();
      this.recognition = rec;
      this.active = true;
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.active = false;
    try {
      this.recognition?.stop();
    } catch {
      /* noop */
    }
    this.recognition = null;
    this.visemes = { ...EMPTY };
    this.lastText = "";
  }

  sample(): VisemeWeights {
    return this.visemes;
  }
}
