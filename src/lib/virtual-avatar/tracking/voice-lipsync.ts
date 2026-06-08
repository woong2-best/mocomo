import type { VisemeWeights } from "@/lib/virtual-avatar/tracking/types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/** Web Audio 마이크 → 5모음 립싱크 (실시간 스펙트럼 분석) */
export class VoiceLipSync {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Float32Array | null = null;
  private timeData: Float32Array | null = null;
  private level = 0;

  async attach(stream: MediaStream): Promise<boolean> {
    this.detach();
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return false;

    try {
      this.ctx = new AudioContext();
      const source = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.65;
      source.connect(this.analyser);
      this.freqData = new Float32Array(this.analyser.frequencyBinCount);
      this.timeData = new Float32Array(this.analyser.fftSize);
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return true;
    } catch {
      this.detach();
      return false;
    }
  }

  detach() {
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.freqData = null;
    this.timeData = null;
    this.level = 0;
  }

  /** 현재 음량 0~1 */
  getLevel(): number {
    return this.level;
  }

  sample(): VisemeWeights | null {
    if (!this.analyser || !this.freqData || !this.timeData) return null;

    this.analyser.getFloatFrequencyData(this.freqData as Float32Array<ArrayBuffer>);
    this.analyser.getFloatTimeDomainData(this.timeData as Float32Array<ArrayBuffer>);

    let rms = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      rms += this.timeData[i] * this.timeData[i];
    }
    rms = Math.sqrt(rms / this.timeData.length);
    this.level = clamp01(rms * 14);

    if (this.level < 0.035) {
      return { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    }

    const sr = this.ctx?.sampleRate ?? 44100;
    const binHz = sr / this.analyser.fftSize;

    const bandEnergy = (loHz: number, hiHz: number) => {
      const lo = Math.floor(loHz / binHz);
      const hi = Math.min(Math.ceil(hiHz / binHz), this.freqData!.length - 1);
      let sum = 0;
      let n = 0;
      for (let i = lo; i <= hi; i++) {
        sum += dbToLinear(this.freqData![i]);
        n++;
      }
      return n > 0 ? sum / n : 0;
    };

    const low = bandEnergy(80, 400);
    const mid = bandEnergy(400, 1200);
    const midHigh = bandEnergy(1200, 2800);
    const high = bandEnergy(2800, 6000);
    const total = low + mid + midHigh + high + 1e-8;

    const nl = low / total;
    const nm = mid / total;
    const nmh = midHigh / total;
    const nh = high / total;

    const vol = this.level;
    const centroid = (nm * 800 + nmh * 2000 + nh * 4200) / (nm + nmh + nh + 1e-8);
    const wideOpen = centroid < 900 ? 1.15 : centroid > 2400 ? 0.85 : 1;

    return {
      oh: clamp01(nl * 1.45 * vol * wideOpen),
      ou: clamp01(nl * 0.9 * vol + nm * 0.15 * vol),
      aa: clamp01(nm * 1.4 * vol + nl * 0.25 * vol),
      ih: clamp01(nmh * 1.25 * vol + nh * 0.4 * vol),
      ee: clamp01(nh * 1.3 * vol + nmh * 0.5 * vol),
    };
  }
}
