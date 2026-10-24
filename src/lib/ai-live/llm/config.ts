import type { LiveAvatarId } from "@/lib/ai-live/avatars";
import { AVATAR_LLM_COMPANIES, type AvatarLlmCompany } from "@/lib/ai-live/llm/types";

export type { AvatarLlmCompany };

export type ProviderConfig = {
  id: AvatarLlmCompany;
  trainsOnFreeTier: boolean;
  envKey: string;
  extraEnvKeys?: string[];
  /** Empty means “build candidates from that company’s model list API”. */
  candidates: string[];
};

const DEFAULT_PRIMARY: Record<LiveAvatarId, AvatarLlmCompany> = {
  zelie: "groq",
  mio: "cerebras",
  nangnang: "mistral",
  cleo: "openrouter",
};

const DEFAULT_COMPANY_ORDER: AvatarLlmCompany[] = [
  "groq",
  "cerebras",
  "mistral",
  "openrouter",
  "gemini",
  "workers-ai",
];

const DEFAULT_PROVIDERS: Record<Exclude<AvatarLlmCompany, "workers-ai">, ProviderConfig> = {
  groq: {
    id: "groq",
    trainsOnFreeTier: false,
    envKey: "GROQ_API_KEY",
    candidates: ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "qwen/qwen3.6-27b"],
  },
  cerebras: {
    id: "cerebras",
    trainsOnFreeTier: false,
    envKey: "CEREBRAS_API_KEY",
    candidates: [],
  },
  mistral: {
    id: "mistral",
    trainsOnFreeTier: true,
    envKey: "MISTRAL_API_KEY",
    candidates: [],
  },
  openrouter: {
    id: "openrouter",
    trainsOnFreeTier: false,
    envKey: "OPENROUTER_API_KEY",
    candidates: [],
  },
  gemini: {
    id: "gemini",
    trainsOnFreeTier: true,
    envKey: "GEMINI_API_KEY",
    extraEnvKeys: ["GOOGLE_GENERATIVE_AI_API_KEY"],
    candidates: [
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
    ],
  },
};

function csv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function envCompany(name: string): AvatarLlmCompany | null {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return null;
  return (AVATAR_LLM_COMPANIES as readonly string[]).includes(raw) ? (raw as AvatarLlmCompany) : null;
}

export function providerConfig(id: Exclude<AvatarLlmCompany, "workers-ai">): ProviderConfig {
  const base = DEFAULT_PROVIDERS[id];
  const fromEnv = csv(`AVATAR_LLM_${id.toUpperCase().replace("-", "_")}_CANDIDATES`);
  return fromEnv.length ? { ...base, candidates: fromEnv } : base;
}

export function allProviderConfigs(): ProviderConfig[] {
  return (Object.keys(DEFAULT_PROVIDERS) as Array<Exclude<AvatarLlmCompany, "workers-ai">>).map(providerConfig);
}

export function envKeyValue(keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function companyConfigured(company: AvatarLlmCompany): boolean {
  if (company === "workers-ai") {
    const account = process.env.CF_ACCOUNT_ID?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    return Boolean(account && process.env.CF_API_TOKEN?.trim());
  }
  const cfg = providerConfig(company);
  return Boolean(envKeyValue([cfg.envKey, ...(cfg.extraEnvKeys ?? [])]));
}

export function primaryCompanyForAvatar(avatar: LiveAvatarId): AvatarLlmCompany {
  const override = envCompany(`AVATAR_LLM_${avatar.toUpperCase()}_PROVIDER`);
  return override ?? DEFAULT_PRIMARY[avatar];
}

export function companyOrder(): AvatarLlmCompany[] {
  const fromEnv = csv("AVATAR_LLM_COMPANY_ORDER").filter((id): id is AvatarLlmCompany =>
    (AVATAR_LLM_COMPANIES as readonly string[]).includes(id),
  );
  if (!fromEnv.length) return DEFAULT_COMPANY_ORDER;
  const missing = DEFAULT_COMPANY_ORDER.filter((id) => !fromEnv.includes(id));
  return [...fromEnv, ...missing];
}

export function deferTrainingProviders(): boolean {
  const raw = process.env.AVATAR_LLM_DEFER_TRAINING?.trim().toLowerCase();
  if (!raw) return false;
  return raw === "1" || raw === "true" || raw === "yes";
}

export function trainsOnFreeTier(company: AvatarLlmCompany): boolean {
  if (company === "workers-ai") return false;
  return providerConfig(company).trainsOnFreeTier;
}

export function requestBudgetMs(): number {
  const raw = Number(process.env.AVATAR_LLM_BUDGET_MS);
  return Number.isFinite(raw) && raw > 500 ? raw : 8_000;
}

export function candidateTimeoutMs(): number {
  const raw = Number(process.env.AVATAR_LLM_CANDIDATE_MS);
  return Number.isFinite(raw) && raw > 200 ? raw : 2_500;
}

export function cooldownMs(): number {
  const raw = Number(process.env.AVATAR_LLM_COOLDOWN_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 10 * 60 * 1000;
}

export function catalogTtlMs(): number {
  const raw = Number(process.env.AVATAR_LLM_CATALOG_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 24 * 60 * 60 * 1000;
}

export function alertCooldownMs(): number {
  return 60 * 60 * 1000;
}

export function fallbackCompanyOrder(primary: AvatarLlmCompany): AvatarLlmCompany[] {
  const rest = companyOrder().filter((id) => id !== primary && id !== "workers-ai");
  const configured = rest.filter(companyConfigured);
  if (!deferTrainingProviders()) return [...configured, "workers-ai"];
  const later = configured.filter(trainsOnFreeTier);
  const sooner = configured.filter((id) => !trainsOnFreeTier(id));
  return [...sooner, ...later, "workers-ai"];
}
