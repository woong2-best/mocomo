import type { LlmProvider } from "@/lib/ai-fallback/quota";
import { safeLogWarn } from "@/lib/safe-log";

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const VISION_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

export type WorkersAiChatInput = {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

function accountId(): string {
  return process.env.CF_ACCOUNT_ID?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
}

function apiToken(): string {
  return process.env.CF_API_TOKEN?.trim() || "";
}

export function workersAiConfigured(): boolean {
  return Boolean(accountId() && apiToken());
}

function workersAiModel(): string {
  return process.env.CF_WORKERS_AI_MODEL?.trim() || DEFAULT_MODEL;
}

function chatUrl(): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId()}/ai/v1/chat/completions`;
}

function runUrl(model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId()}/ai/run/${model}`;
}

function readChatText(json: {
  choices?: { message?: { content?: string } }[];
  result?: { response?: string };
}): string {
  const fromChoices = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (fromChoices) return fromChoices;
  return json.result?.response?.trim() ?? "";
}

export async function workersAiChat(input: WorkersAiChatInput): Promise<string | null> {
  if (!workersAiConfigured()) return null;
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (input.system?.trim()) messages.push({ role: "system", content: input.system });
  messages.push({ role: "user", content: input.user });

  try {
    const res = await fetch(chatUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken()}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(input.timeoutMs ?? 15_000),
      body: JSON.stringify({
        model: workersAiModel(),
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxTokens ?? 512,
        messages,
      }),
    });
    if (!res.ok) {
      safeLogWarn("workers-ai", { result: "fail", status: res.status, feature: "chat" });
      return null;
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      result?: { response?: string };
    };
    return readChatText(json) || null;
  } catch {
    safeLogWarn("workers-ai", { result: "throw", feature: "chat" });
    return null;
  }
}

export async function workersAiVisionChat(input: {
  prompt: string;
  imageBase64: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  if (!workersAiConfigured()) return null;
  try {
    const res = await fetch(runUrl(VISION_MODEL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken()}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(input.timeoutMs ?? 45_000),
      body: JSON.stringify({
        prompt: input.prompt,
        image: input.imageBase64,
        max_tokens: input.maxTokens ?? 900,
      }),
    });
    if (!res.ok) {
      safeLogWarn("workers-ai", { result: "fail", status: res.status, feature: "vision" });
      return null;
    }
    const json = (await res.json()) as { result?: { response?: string; description?: string } };
    const text = json.result?.response?.trim() || json.result?.description?.trim() || "";
    return text || null;
  } catch {
    safeLogWarn("workers-ai", { result: "throw", feature: "vision" });
    return null;
  }
}

export function logWorkersAiFallback(payload: {
  provider: LlmProvider;
  feature: string;
  reason: string;
  status?: number;
  skipped?: boolean;
}): void {
  safeLogWarn("llm-fallback", {
    provider: payload.provider,
    feature: payload.feature,
    reason: payload.reason,
    status: payload.status ?? null,
    skipped: payload.skipped === true,
    fallback: "cloudflare-workers-ai",
  });
}
