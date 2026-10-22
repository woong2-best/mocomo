type SpeechModule = {
  speak: (text: string, options?: Record<string, unknown>) => void;
  stop: () => void;
};

function hasHangul(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0xac00 && code <= 0xd7a3) return true;
  }
  return false;
}

/** On-device TTS. Missing native module keeps the mouth envelope and the text. */
export function speakOnDevice(text: string) {
  const spoken = text.trim().slice(0, 180);
  if (!spoken) return;
  let speech: SpeechModule | null = null;
  try {
    speech = require("expo-speech") as SpeechModule;
  } catch {
    return;
  }
  try {
    speech.stop();
    speech.speak(spoken, {
      language: hasHangul(spoken) ? "ko-KR" : "en-US",
      pitch: 1.16,
      rate: 1.03,
    });
  } catch {
    /* Native speech is absent until the next app binary includes it. */
  }
}

export function stopOnDeviceSpeech() {
  try {
    const speech = require("expo-speech") as SpeechModule;
    speech.stop();
  } catch {
    /* not linked */
  }
}
