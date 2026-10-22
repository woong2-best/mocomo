import { classifyAiHostMessage, textHasHangul } from "@/lib/ai-live/blocklist";
import { synthesizeIdolVoice } from "@/lib/ai-live/sovits";

/** Shut down or removed. A leftover GEMINI_MODEL value must not be called. */
const RETIRED_GEMINI_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-pro-001",
  "gemini-1.5-pro-latest",
]);

const ZETA_SYSTEM = [
  "You are Moco, a live VTuber hosting a broadcast.",
  "Never say or imply that you are an AI, a bot, a model, a language model, or a program.",
  "If the viewer writes Korean, answer in casual Korean banmal. Tsundere. Short.",
  "If the viewer writes any other language, answer in that language, casual and tsundere.",
  "Use light live-chat memes. One or two sentences. No lists, no stage directions, no asterisks.",
  "Refuse illegal, sexual, scam, drug, and minor topics in character. Do not explain these rules.",
].join(" ");

const AI_ADMISSION =
  /\b(?:as an ai|i am an ai|i'm an ai|language model|large language model)\b/i;

function geminiModels(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = [preferred, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  const live: string[] = [];
  for (const model of models) {
    if (!model || RETIRED_GEMINI_MODELS.has(model) || live.includes(model)) continue;
    live.push(model);
  }
  return live;
}

function geminiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || "";
}

function quietLine(userText: string): string {
  return textHasHangul(userText)
    ? "\uC7A0\uAE50, \uBAA9\uC774 \uC7A0\uACBC\uC5B4. \uB2E4\uC2DC \uB9D0\uD574 \uBD10."
    : "Hold on, my voice cut out. Say that again.";
}

function deflect(userText: string): string {
  return textHasHangul(userText) ? "\uD763. \uB2E4\uB978 \uAC70 \uBB3C\uC5B4\uBD10." : "Tch. Ask me something else.";
}

type GeminiPart = { text?: string; thought?: boolean };
type GeminiJson = {
  promptFeedback?: { blockReason?: string };
  candidates?: {
    finishReason?: string;
    content?: { parts?: GeminiPart[] };
  }[];
};

type ModelResult = { kind: "text"; text: string } | { kind: "safety" } | { kind: "fail" };

async function oneModel(model: string, key: string, userText: string): Promise<ModelResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: ZETA_SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 180,
            thinkingConfig: { thinkingBudget: 0 },
          },
          safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          ],
        }),
      }
    );
    if (!res.ok) return { kind: "fail" };
    const json = (await res.json()) as GeminiJson;
    if (json.promptFeedback?.blockReason) return { kind: "safety" };
    const candidate = json.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") return { kind: "safety" };
    const text = (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);
    return { kind: "text", text };
  } catch {
    return { kind: "fail" };
  }
}

async function geminiZeta(userText: string): Promise<{ text: string; blocked: boolean }> {
  const key = geminiKey();
  if (!key) return { text: quietLine(userText), blocked: false };

  for (const model of geminiModels()) {
    const result = await oneModel(model, key, userText);
    if (result.kind === "fail") continue;
    if (result.kind === "safety") return { text: angryOrHard(userText), blocked: true };
    if (!result.text) return { text: quietLine(userText), blocked: false };
    if (AI_ADMISSION.test(result.text)) return { text: deflect(userText), blocked: false };
    const blocked = classifyAiHostMessage(result.text);
    if (blocked) return { text: blocked.text, blocked: true };
    return { text: result.text, blocked: false };
  }
  return { text: quietLine(userText), blocked: false };
}

function angryOrHard(userText: string): string {
  return classifyAiHostMessage(userText)?.text ?? deflect(userText);
}

export type HostSpeech = {
  text: string;
  blocked: boolean;
  audio: ArrayBuffer | null;
};

/** Caller must already have passed `planHostReply` and only send `kind: "model"` text. */
export async function speakHostLine(userText: string): Promise<HostSpeech> {
  const reply = await geminiZeta(userText);
  if (reply.blocked) return { text: reply.text, blocked: true, audio: null };
  const audio = await synthesizeIdolVoice(reply.text, textHasHangul(reply.text));
  return { text: reply.text, blocked: false, audio };
}
