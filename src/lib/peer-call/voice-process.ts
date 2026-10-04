"use client";

export type EnhancedMic = {
  stream: MediaStream;
  stop: () => void;
};

const noop = () => undefined;

/**
 * Always-on voice chain: rumble cut, bass emphasis, speech presence, light compression.
 * Returns the original stream when the audio graph cannot start.
 */
export async function enhanceCallMicrophone(raw: MediaStream): Promise<EnhancedMic> {
  const audioTracks = raw.getAudioTracks();
  if (audioTracks.length === 0 || typeof AudioContext === "undefined") {
    return { stream: raw, stop: noop };
  }

  let ctx: AudioContext;
  try {
    ctx = new AudioContext();
  } catch {
    return { stream: raw, stop: noop };
  }

  const source = ctx.createMediaStreamSource(new MediaStream(audioTracks));
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 80;
  highpass.Q.value = 0.7;

  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 160;
  bass.gain.value = 4.5;

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 3000;
  presence.Q.value = 0.8;
  presence.gain.value = 2.5;

  const air = ctx.createBiquadFilter();
  air.type = "highshelf";
  air.frequency.value = 8000;
  air.gain.value = 1.5;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -22;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.22;

  const dest = ctx.createMediaStreamDestination();
  source.connect(highpass);
  highpass.connect(bass);
  bass.connect(presence);
  presence.connect(air);
  air.connect(compressor);
  compressor.connect(dest);

  const processed = dest.stream.getAudioTracks()[0];
  const abandon = () => {
    try {
      source.disconnect();
    } catch {
      /* already stopped */
    }
    void ctx.close();
  };

  if (!processed) {
    abandon();
    return { stream: raw, stop: noop };
  }

  try {
    await Promise.race([
      ctx.resume(),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 400);
      }),
    ]);
  } catch {
    abandon();
    return { stream: raw, stop: noop };
  }

  if (ctx.state !== "running") {
    abandon();
    return { stream: raw, stop: noop };
  }

  try {
    processed.contentHint = "speech";
  } catch {
    /* older browsers */
  }
  const out = new MediaStream([processed, ...raw.getVideoTracks()]);

  let stopped = false;
  return {
    stream: out,
    stop: () => {
      if (stopped) return;
      stopped = true;
      processed.stop();
      abandon();
    },
  };
}
