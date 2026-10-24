import { isQuotaFailure } from "@/lib/ai-fallback";
import { workersAiChat, workersAiConfigured } from "@/lib/ai-fallback/workers-ai";
import { companyConfigured, envKeyValue, providerConfig } from "@/lib/ai-live/llm/config";
import type { AvatarLlmCompany, ChatRequest, ChatResult } from "@/lib/ai-live/llm/types";
import { readHostEmotionReply } from "@/lib/ai-live/vrm-expression";

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

const DEAD_BODY =
  /model_not_found|model_decommissioned|does not exist|no longer (?:supported|available)|is not found|decommissioned|unknown model/i;

type CompatCompany = "groq" | "cerebras" | "mistral" | "openrouter";

const COMPAT: Record<
  CompatCompany,
  { baseUrl: string; envKeys: string[]; extraHeaders?: () => Record<string, string> }
> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", envKeys: ["GROQ_API_KEY"] },
  cerebras: { baseUrl: "https://api.cerebras.ai/v1", envKeys: ["CEREBRAS_API_KEY"] },
  mistral: { baseUrl: "https://api.mistral.ai/v1", envKeys: ["MISTRAL_API_KEY"] },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    envKeys: ["OPENROUTER_API_KEY"],
    extraHeaders: () => ({
      "HTTP-Referer": process.env.NEXTAUTH_URL?.trim() || "https://mocomo.net",
      "X-Title": "MoCoMo",
    }),
  },
};

export function isDeadModelFailure(status: number, body = ""): boolean {
  if (status === 404) return true;
  return status === 400 && DEAD_BODY.test(body);
}

function authHeaders(company: CompatCompany): Record<string, string> | null {
  const spec = COMPAT[company];
  const key = envKeyValue(spec.envKeys);
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(spec.extraHeaders?.() ?? {}),
  };
}

function readModelIds(json: unknown): string[] {
  if (!json || typeof json !== "object") return [];
  const rec = json as { data?: unknown; models?: unknown };
  const rows = Array.isArray(rec.data) ? rec.data : Array.isArray(rec.models) ? rec.models : [];
  const ids: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as { id?: unknown; name?: unknown };
    const raw = typeof item.id === "string" ? item.id : typeof item.name === "string" ? item.name : "";
    const id = raw.replace(/^models\//, "").trim();
    if (id) ids.push(id);
  }
  return ids;
}

function isChatListed(company: CompatCompany, row: Record<string, unknown>, id: string): boolean {
  if (company === "openrouter") {
    if (!id.includes(":free")) return false;
    const arch = row.architecture as { output_modalities?: unknown; modality?: unknown } | undefined;
    const outs = Array.isArray(arch?.output_modalities) ? arch.output_modalities : [];
    const modality = typeof arch?.modality === "string" ? arch.modality : "";
    if (outs.length && !outs.includes("text")) return false;
    if (modality && !modality.includes("text")) return false;
    if (/embed|whisper|tts|moderation|rerank/i.test(id)) return false;
    return true;
  }
  if (company === "mistral") {
    const caps = row.capabilities as { completion_chat?: unknown; completion_fim?: unknown } | undefined;
    if (caps && caps.completion_chat === false) return false;
    if (caps?.completion_fim) return false;
    if (/embed|moderation|ocr|code|fim|transcrib|labs-/i.test(id)) return false;
    return true;
  }
  return !/whisper|tts|embed|moderation|guard/i.test(id);
}

export async function listCompanyModels(company: AvatarLlmCompany, timeoutMs = 6_000): Promise<string[]> {
  if (company === "workers-ai") return [];
  if (!companyConfigured(company)) return [];

  if (company === "gemini") {
    const key = envKeyValue(["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]);
    if (!key) return [];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    return (json.models ?? [])
      .filter((model) => (model.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((model) => (model.name ?? "").replace(/^models\//, ""))
      .filter(Boolean);
  }

  const spec = COMPAT[company];
  const headers = authHeaders(company);
  if (!headers) return [];
  const res = await fetch(`${spec.baseUrl}/models`, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: Record<string, unknown>[] };
  const rows = Array.isArray(json.data) ? json.data : [];
  const ids: string[] = [];
  for (const row of rows) {
    const raw = typeof row.id === "string" ? row.id : typeof row.name === "string" ? String(row.name) : "";
    const id = raw.replace(/^models\//, "").trim();
    if (!id || !isChatListed(company, row, id)) continue;
    ids.push(id);
  }
  if (company === "openrouter") {
    ids.sort((a, b) => a.length - b.length || a.localeCompare(b));
  }
  if (company === "mistral") {
    const score = (id: string) => {
      let value = 0;
      if (/-latest$/.test(id)) value += 3;
      if (/small|nemo|ministral/.test(id)) value += 2;
      return value;
    };
    ids.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
  }
  return ids;
}

async function openaiCompatChat(req: ChatRequest, jsonMode: boolean): Promise<ChatResult> {
  const company = req.company as CompatCompany;
  const spec = COMPAT[company];
  const headers = authHeaders(company);
  if (!headers) return { kind: "fail" };
  const res = await fetch(`${spec.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(req.timeoutMs),
    body: JSON.stringify({
      model: req.model,
      temperature: 0.9,
      max_tokens: 512,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.userText },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (isDeadModelFailure(res.status, body)) return { kind: "dead", status: res.status };
    if (isQuotaFailure(res.status, body)) return { kind: "rate_limit", status: res.status };
    if (jsonMode && res.status === 400) return openaiCompatChat(req, false);
    return { kind: "fail", status: res.status };
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const spoken = readHostEmotionReply(json.choices?.[0]?.message?.content?.trim() ?? "");
  if (!spoken) return { kind: "fail" };
  return { kind: "text", text: spoken.text, emotion: spoken.emotion };
}

type GeminiPart = { text?: string; thought?: boolean };
type GeminiJson = {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: GeminiPart[] } }[];
};

async function geminiChat(req: ChatRequest, jsonMode: boolean): Promise<ChatResult> {
  const key = envKeyValue(["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]);
  if (!key) return { kind: "fail" };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(req.timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts: [{ text: req.userText }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: jsonMode ? 512 : 240,
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
    if (isDeadModelFailure(res.status, body)) return { kind: "dead", status: res.status };
    if (isQuotaFailure(res.status, body)) return { kind: "rate_limit", status: res.status };
    if (jsonMode && res.status === 400) return geminiChat(req, false);
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
}

async function workersChat(req: ChatRequest): Promise<ChatResult> {
  if (!workersAiConfigured()) return { kind: "fail" };
  const raw = await workersAiChat({
    system: req.system,
    user: req.userText,
    temperature: 0.9,
    maxTokens: 180,
    timeoutMs: req.timeoutMs,
  });
  const spoken = readHostEmotionReply(raw ?? "");
  if (!spoken) return { kind: "fail" };
  return { kind: "text", text: spoken.text, emotion: spoken.emotion };
}

export async function companyChat(req: ChatRequest): Promise<ChatResult> {
  try {
    if (req.company === "workers-ai") return workersChat(req);
    if (req.company === "gemini") return geminiChat(req, true);
    if (req.company in COMPAT) return openaiCompatChat(req, true);
    return { kind: "fail" };
  } catch {
    return { kind: "fail" };
  }
}

export function discoverCandidates(company: AvatarLlmCompany, listed: string[]): string[] {
  if (company === "workers-ai") return [];
  const listedSet = new Set(listed);
  const preferred = providerConfig(company).candidates;
  if (preferred.length) return preferred.filter((id) => listedSet.has(id));
  return listed.slice(0, 3);
}

