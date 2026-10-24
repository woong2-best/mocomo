import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cooldownMs } from "@/lib/ai-live/llm/config";
import type { AvatarLlmCatalog, AvatarLlmCompany, CatalogModelState, CatalogStore } from "@/lib/ai-live/llm/types";

export const AVATAR_LLM_CATALOG_KEY = "avatar-llm-catalog";

function emptyState(): CatalogModelState {
  return { live: [], dead: {}, cooldown: {} };
}

function asCatalog(value: unknown): AvatarLlmCatalog | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as { checkedAt?: unknown; providers?: unknown };
  if (typeof rec.checkedAt !== "string" || !rec.providers || typeof rec.providers !== "object") return null;
  return value as AvatarLlmCatalog;
}

export function emptyCatalog(): AvatarLlmCatalog {
  return { checkedAt: "", providers: {} };
}

export function providerState(catalog: AvatarLlmCatalog, company: AvatarLlmCompany): CatalogModelState {
  return catalog.providers[company] ?? emptyState();
}

export function usableModels(catalog: AvatarLlmCatalog, company: AvatarLlmCompany, now = Date.now()): string[] {
  const state = providerState(catalog, company);
  return state.live.filter((id) => {
    const until = state.cooldown[id]?.until;
    return !until || Date.parse(until) <= now;
  });
}

export function markModelDead(catalog: AvatarLlmCatalog, company: AvatarLlmCompany, model: string, status: number, now = Date.now()): AvatarLlmCatalog {
  const state = { ...providerState(catalog, company) };
  state.live = state.live.filter((id) => id !== model);
  state.dead = { ...state.dead, [model]: { status, at: new Date(now).toISOString() } };
  return {
    ...catalog,
    providers: { ...catalog.providers, [company]: state },
  };
}

export function markModelCooldown(catalog: AvatarLlmCatalog, company: AvatarLlmCompany, model: string, status: number, now = Date.now()): AvatarLlmCatalog {
  const state = { ...providerState(catalog, company) };
  state.cooldown = {
    ...state.cooldown,
    [model]: { status, until: new Date(now + cooldownMs()).toISOString() },
  };
  return {
    ...catalog,
    providers: { ...catalog.providers, [company]: state },
  };
}

export function siteSettingCatalogStore(): CatalogStore {
  return {
    async load() {
      const row = await db.siteSetting.findUnique({ where: { key: AVATAR_LLM_CATALOG_KEY } });
      return asCatalog(row?.value);
    },
    async save(catalog) {
      const value = catalog as unknown as Prisma.InputJsonValue;
      await db.siteSetting.upsert({
        where: { key: AVATAR_LLM_CATALOG_KEY },
        create: { key: AVATAR_LLM_CATALOG_KEY, value },
        update: { value },
      });
    },
  };
}

export function memoryCatalogStore(seed: AvatarLlmCatalog | null = null): CatalogStore & { snapshot(): AvatarLlmCatalog | null } {
  let current = seed;
  return {
    async load() {
      return current;
    },
    async save(catalog) {
      current = catalog;
    },
    snapshot() {
      return current;
    },
  };
}
