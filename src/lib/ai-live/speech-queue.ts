export type SpeechPriority = "chat" | "donation";

export type SpeechJob = {
  audio: ArrayBuffer;
  priority: SpeechPriority;
};

export type SpeechQueueState = {
  items: SpeechJob[];
  epoch: number;
};

export function createSpeechQueue(): SpeechQueueState {
  return { items: [], epoch: 0 };
}

/**
 * Chat waits its turn. A donation cuts the current line:
 * the epoch bumps so the player drops what it is saying, and the new clip is first.
 */
export function enqueueSpeech(state: SpeechQueueState, job: SpeechJob): boolean {
  if (job.priority === "donation") {
    state.epoch += 1;
    state.items.unshift(job);
    return true;
  }
  state.items.push(job);
  return false;
}
