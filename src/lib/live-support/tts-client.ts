const MAX_TTS_LENGTH = 120;

export function speakCheerMessage(text: string, voiceHint: "female" | "male" = "female") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const trimmed = text.trim().slice(0, MAX_TTS_LENGTH);
  if (!trimmed) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(trimmed);
  utter.lang = "ko-KR";
  utter.rate = 1.05;
  utter.pitch = voiceHint === "female" ? 1.15 : 0.9;

  const voices = window.speechSynthesis.getVoices();
  const koVoice =
    voices.find((v) => v.lang.startsWith("ko") && v.name.toLowerCase().includes(voiceHint === "female" ? "female" : "male")) ??
    voices.find((v) => v.lang.startsWith("ko"));
  if (koVoice) utter.voice = koVoice;

  window.speechSynthesis.speak(utter);
}
