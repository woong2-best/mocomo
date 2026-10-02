let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let oscillators: OscillatorNode[] = [];

/** 은은한 오후 햇살 패드 — A-2에서 루프 에셋으로 교체 가능 */
export function startAptAmbientPad(): void {
  if (typeof window === "undefined") return;
  stopAptAmbientPad();
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioCtx.destination);

    const freqs = [196, 246.94, 293.66];
    for (const f of freqs) {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = audioCtx.createGain();
      g.gain.value = 0.012;
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      oscillators.push(osc);
    }

    const t = audioCtx.currentTime;
    masterGain.gain.linearRampToValueAtTime(0.35, t + 1.8);
  } catch {
    stopAptAmbientPad();
  }
}

export function stopAptAmbientPad(fadeMs = 400): void {
  if (!audioCtx || !masterGain) {
    oscillators = [];
    return;
  }
  try {
    const t = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0, t + fadeMs / 1000);
    window.setTimeout(() => {
      for (const o of oscillators) {
        try {
          o.stop();
          o.disconnect();
        } catch {
          /* ignore */
        }
      }
      oscillators = [];
      try {
        void audioCtx?.close();
      } catch {
        /* ignore */
      }
      audioCtx = null;
      masterGain = null;
    }, fadeMs + 50);
  } catch {
    oscillators = [];
    audioCtx = null;
    masterGain = null;
  }
}
