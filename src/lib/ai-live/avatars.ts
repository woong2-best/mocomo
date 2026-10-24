import { primaryCompanyForAvatar, type AvatarLlmCompany } from "@/lib/ai-live/llm/config";

export type LiveAvatarId = "zelie" | "cleo" | "mio" | "nangnang";
export type IdolId = "cleo" | "mio" | "nangnang";
export type { AvatarLlmCompany };

export type AvatarLlmRoute = { company: AvatarLlmCompany };

const ALIAS: Record<string, LiveAvatarId> = {
  zelie: "zelie",
  moco: "zelie",
  cleo: "cleo",
  airi: "cleo",
  mio: "mio",
  chloe: "mio",
  nangnang: "nangnang",
  stella: "nangnang",
};

export const LIVE_AVATAR_IDS = ["zelie", "cleo", "mio", "nangnang"] as const;

/** One primary company per avatar. Model IDs come from discovery, not this table. */
export const AVATAR_LLM: Record<LiveAvatarId, AvatarLlmRoute> = {
  zelie: { company: "groq" },
  cleo: { company: "gemini" },
  mio: { company: "openrouter" },
  nangnang: { company: "mistral" },
};

export function resolveLiveAvatarId(value: string | null | undefined): LiveAvatarId | null {
  const id = value?.trim().toLowerCase();
  if (!id) return null;
  return ALIAS[id] ?? null;
}

export function resolveIdolId(value: string | null | undefined): IdolId | null {
  const id = resolveLiveAvatarId(value);
  return id && id !== "zelie" ? id : null;
}

export function isIdolId(value: string | null | undefined): value is IdolId {
  return resolveIdolId(value) != null;
}

export function isLiveAvatarId(value: string | null | undefined): value is LiveAvatarId {
  return resolveLiveAvatarId(value) != null;
}

export function llmRouteForAvatar(value: string | null | undefined): AvatarLlmRoute {
  const avatar = resolveLiveAvatarId(value) ?? "zelie";
  return { company: primaryCompanyForAvatar(avatar) };
}
