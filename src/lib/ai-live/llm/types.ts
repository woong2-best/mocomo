import type { VrmEmotion } from "@/lib/ai-live/vrm-expression";

export const AVATAR_LLM_COMPANIES = [
  "groq",
  "cerebras",
  "mistral",
  "openrouter",
  "gemini",
  "workers-ai",
] as const;

export type AvatarLlmCompany = (typeof AVATAR_LLM_COMPANIES)[number];

export type ChatResult =
  | { kind: "text"; text: string; emotion: VrmEmotion }
  | { kind: "safety" }
  | { kind: "rate_limit"; status: number }
  | { kind: "dead"; status: number }
  | { kind: "fail"; status?: number };

export type CatalogModelState = {
  live: string[];
  dead: Record<string, { status: number; at: string }>;
  cooldown: Record<string, { until: string; status: number }>;
};

export type AvatarLlmCatalog = {
  checkedAt: string;
  providers: Partial<Record<AvatarLlmCompany, CatalogModelState>>;
};

export type ChatRequest = {
  company: AvatarLlmCompany;
  model: string;
  system: string;
  userText: string;
  timeoutMs: number;
};

export type CatalogStore = {
  load(): Promise<AvatarLlmCatalog | null>;
  save(catalog: AvatarLlmCatalog): Promise<void>;
};
