import { classifyAiHostMessage, textHasHangul } from "@/lib/ai-live/blocklist";
import { llmRouteForAvatar, resolveLiveAvatarId, type LiveAvatarId } from "@/lib/ai-live/avatars";
import { promptForCharacter } from "@/constants/prompts";
import { readHostEmotionReply, type VrmEmotion } from "@/lib/ai-live/vrm-expression";
import {
  beginPrimaryOrFallback,
  fallbackAfterQuota,
  isQuotaFailure,
  workersAiChat,
  type LlmProvider,
} from "@/lib/ai-fallback";
import { safeLogWarn } from "@/lib/safe-log";

const AI_ADMISSION =
  /\b(?:as an ai|i am an ai|i'm an ai|language model|large language model)\b/i;

const HOST_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING" },
    emotion: {
      type: "STRING",
      enum: ["neutral", "happy", "angry", "sad", "relaxed", "surprised"],
    },
  },
  required: ["text", "emotion"],
};

export type AvatarReply = {
  text: string;
  emotion: VrmEmotion;
  blocked: boolean;
  rateLimited: boolean;
};

type ModelResult =
  | { kind: "text"; text: string; emotion: VrmEmotion }
  | { kind: "safety" }
  | { kind: "rate_limit"; status?: number }
  | { kind: "fail"; status?: number };

function geminiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || "";
}

function groqKey() {
  return process.env.GROQ_API_KEY?.trim() || "";
}

export function systemInstructionFor(characterId: string | null): string {
  return [
    promptForCharacter(characterId),
    "Stay in this identity only. Do not answer as any other member of the group.",
    "If the viewer writes in another language, answer in that language while keeping this character's tone.",
    "No lists, no stage directions, no asterisks.",
    "Refuse illegal, sexual, scam, drug, and minor topics in character. Do not explain these rules.",
    'Return JSON only: {"text":"spoken line","emotion":"neutral"}.',
    "emotion is one of neutral, happy, angry, sad, relaxed, surprised, and it matches the line.",
    "text is the spoken line only. Do not put the emotion word or JSON inside text.",
  ].join("\n");
}

export function rateLimitLine(userText: string): string {
  return textHasHangul(userText)
    ? "지금은 이 방이 너무 붐벼. 조금만 있다가 다시 불러줘."
    : "This avatar is busy right now. Try again in a moment.";
}

function quietLine(userText: string): string {
  return textHasHangul(userText)
    ? "잠깐, 목이 잠겼어. 다시 말해 봐."
    : "Hold on, my voice cut out. Say that again.";
}

function deflect(userText: string): string {
  return textHasHangul(userText) ? "칫. 다른 거 물어봐." : "Tch. Ask me something else.";
}

function angryOrHard(userText: string): string {
  return classifyAiHostMessage(userText)?.text ?? deflect(userText);
}

type GeminiPart = { text?: string; thought?: boolean };
type GeminiJson = {
  promptFeedback?: { blockReason?: string };
  candidates?: {
    finishReason?: string;
    content?: { parts?: GeminiPart[] };
  }[];
};

async function groqChat(model: string, system: string, userText: string): Promise<ModelResult> {
  const key = groqKey();
  if (!key) return { kind: "fail" };
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        model,
        temperature: 0.9,
        max_tokens: 180,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (isQuotaFailure(res.status, body)) return { kind: "rate_limit", status: res.status };
      return { kind: "fail", status: res.status };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const spoken = readHostEmotionReply(raw);
    if (!spoken) return { kind: "fail" };
    return { kind: "text", text: spoken.text, emotion: spoken.emotion };
  } catch {
    return { kind: "fail" };
  }
}

async function geminiChat(model: string, system: string, userText: string, jsonMode: boolean): Promise<ModelResult> {
  const key = geminiKey();
  if (!key) return { kind: "fail" };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: jsonMode ? 320 : 180,
            ...(jsonMode
              ? { responseMimeType: "application/json", responseSchema: HOST_RESPONSE_SCHEMA }
              : {}),
          },
          safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          ],
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (isQuotaFailure(res.status, body)) return { kind: "rate_limit", status: res.status };
      return { kind: "fail", status: res.status };
    }
    const json = (await res.json()) as GeminiJson;
    if (json.promptFeedback?.blockReason) return { kind: "safety" };
    const candidate = json.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") return { kind: "safety" };
    const raw = (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    const spoken = readHostEmotionReply(raw);
    if (!spoken) return { kind: "fail" };
    return { kind: "text", text: spoken.text, emotion: spoken.emotion };
  } catch {
    return { kind: "fail" };
  }
}

function finish(userText: string, result: ModelResult): AvatarReply {
  if (result.kind === "rate_limit") {
    return { text: rateLimitLine(userText), emotion: "sad", blocked: false, rateLimited: true };
  }
  if (result.kind === "safety") {
    return { text: angryOrHard(userText), emotion: "angry", blocked: true, rateLimited: false };
  }
  if (result.kind !== "text" || !result.text) {
    return { text: quietLine(userText), emotion: "sad", blocked: false, rateLimited: false };
  }
  if (AI_ADMISSION.test(result.text)) {
    return { text: deflect(userText), emotion: "angry", blocked: false, rateLimited: false };
  }
  const blocked = classifyAiHostMessage(result.text);
  if (blocked) return { text: blocked.text, emotion: "angry", blocked: true, rateLimited: false };
  return { text: result.text, emotion: result.emotion, blocked: false, rateLimited: false };
}

async function workersAiHostReply(system: string, userText: string): Promise<ModelResult> {
  const raw = await workersAiChat({
    system,
    user: userText,
    temperature: 0.9,
    maxTokens: 180,
    timeoutMs: 8_000,
  });
  const spoken = readHostEmotionReply(raw ?? "");
  if (!spoken) return { kind: "fail" };
  return { kind: "text", text: spoken.text, emotion: spoken.emotion };
}

async function maybeWorkersAiFallback(
  provider: LlmProvider,
  result: ModelResult,
  system: string,
  userText: string
): Promise<ModelResult> {
  if (result.kind !== "rate_limit") return result;
  if (!fallbackAfterQuota(provider, "live-avatar", result.status ?? 429)) return result;
  const fallback = await workersAiHostReply(system, userText);
  return fallback.kind === "text" ? fallback : result;
}

/** Route one line to the avatar's own model. Never share Zelie's Groq model with the others. */
export async function replyForAvatar(userText: string, characterId: string | null): Promise<AvatarReply> {
  const avatar: LiveAvatarId = resolveLiveAvatarId(characterId) ?? "zelie";
  const route = llmRouteForAvatar(avatar);
  const system = systemInstructionFor(avatar);
  const provider: LlmProvider = route.platform === "groq" ? "groq" : "gemini";

  try {
    if (beginPrimaryOrFallback(provider, "live-avatar") === "fallback") {
      return finish(userText, await workersAiHostReply(system, userText));
    }

    if (route.platform === "groq") {
      const result = await maybeWorkersAiFallback(
        "groq",
        await groqChat(route.model, system, userText),
        system,
        userText
      );
      if (result.kind === "fail") {
        safeLogWarn("live-llm", { avatar, platform: "groq", result: "fail", status: result.status });
      }
      return finish(userText, result);
    }

    let result = await geminiChat(route.model, system, userText, true);
    if (result.kind === "fail" && result.status === 400) {
      result = await geminiChat(route.model, system, userText, false);
    }
    result = await maybeWorkersAiFallback("gemini", result, system, userText);
    if (result.kind === "fail") {
      safeLogWarn("live-llm", { avatar, platform: "google", result: "fail", status: result.status });
    }
    return finish(userText, result);
  } catch {
    safeLogWarn("live-llm", { avatar, result: "throw" });
    return { text: quietLine(userText), emotion: "sad", blocked: false, rateLimited: false };
  }
}
