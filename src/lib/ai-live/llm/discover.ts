import { allProviderConfigs, catalogTtlMs, companyConfigured } from "@/lib/ai-live/llm/config";
import { emptyCatalog, providerState, siteSettingCatalogStore } from "@/lib/ai-live/llm/catalog";
import { companyChat, discoverCandidates, listCompanyModels } from "@/lib/ai-live/llm/providers";
import type { AvatarLlmCatalog, AvatarLlmCompany, CatalogStore } from "@/lib/ai-live/llm/types";
import { safeLogWarn } from "@/lib/safe-log";

const PROBE_SYSTEM = 'Return JSON only: {"text":"hi","emotion":"neutral"}.';
let discoverInFlight: Promise<AvatarLlmCatalog> | null = null;

export type DiscoverDeps = {
  store?: CatalogStore;
  listModels?: (company: AvatarLlmCompany) => Promise<string[]>;
  probe?: (company: AvatarLlmCompany, model: string) => Promise<{ status: number; ok: boolean; rateLimited?: boolean }>;
  now?: () => number;
};

async function defaultProbe(company: AvatarLlmCompany, model: string) {
  const result = await companyChat({
    company,
    model,
    system: PROBE_SYSTEM,
    userText: "hi",
    timeoutMs: 4_000,
  });
  if (result.kind === "text" || result.kind === "safety") return { status: 200, ok: true };
  if (result.kind === "rate_limit") return { status: result.status, ok: false, rateLimited: true };
  if (result.kind === "dead") return { status: result.status, ok: false };
  return { status: result.status ?? 500, ok: false };
}

export async function discoverModels(deps: DiscoverDeps = {}): Promise<AvatarLlmCatalog> {
  const store = deps.store ?? siteSettingCatalogStore();
  const listModels = deps.listModels ?? listCompanyModels;
  const probe = deps.probe ?? defaultProbe;
  const now = deps.now ?? Date.now;
  const previous = (await store.load()) ?? emptyCatalog();
  const next: AvatarLlmCatalog = { checkedAt: new Date(now()).toISOString(), providers: { ...previous.providers } };

  for (const cfg of allProviderConfigs()) {
    if (!companyConfigured(cfg.id)) {
      next.providers[cfg.id] = { live: [], dead: providerState(previous, cfg.id).dead, cooldown: {} };
      continue;
    }
    try {
      const listed = await listModels(cfg.id);
      const candidates = discoverCandidates(cfg.id, listed);
      const live: string[] = [];
      const dead = { ...providerState(previous, cfg.id).dead };
      const cooldown = { ...providerState(previous, cfg.id).cooldown };
      for (const model of candidates.slice(0, 3)) {
        const probed = await probe(cfg.id, model);
        if (probed.ok) {
          live.push(model);
          delete dead[model];
          delete cooldown[model];
          continue;
        }
        if (probed.rateLimited) {
          cooldown[model] = { status: probed.status, until: new Date(now() + catalogTtlMs() / 24).toISOString() };
          continue;
        }
        if (probed.status === 404 || probed.status === 400) {
          dead[model] = { status: probed.status, at: new Date(now()).toISOString() };
        }
      }
      next.providers[cfg.id] = { live, dead, cooldown };
      safeLogWarn("live-llm-discover", { company: cfg.id, live: live.length, dead: Object.keys(dead).length });
    } catch {
      safeLogWarn("live-llm-discover", { company: cfg.id, result: "throw" });
      next.providers[cfg.id] = providerState(previous, cfg.id);
    }
  }

  await store.save(next);
  return next;
}

export async function discoverModelsOnce(deps: DiscoverDeps = {}): Promise<AvatarLlmCatalog> {
  if (discoverInFlight) return discoverInFlight;
  discoverInFlight = discoverModels(deps).finally(() => {
    discoverInFlight = null;
  });
  return discoverInFlight;
}

export function catalogIsStale(catalog: AvatarLlmCatalog | null, now = Date.now()): boolean {
  if (!catalog?.checkedAt) return true;
  const at = Date.parse(catalog.checkedAt);
  return !Number.isFinite(at) || now - at > catalogTtlMs();
}

export async function discoverModelsIfBoot(): Promise<void> {
  await discoverModelsOnce();
}

export async function ensureCatalog(deps: DiscoverDeps = {}): Promise<AvatarLlmCatalog> {
  const store = deps.store ?? siteSettingCatalogStore();
  const now = deps.now ?? Date.now;
  const current = (await store.load()) ?? emptyCatalog();
  const hasLive = Object.values(current.providers).some((row) => (row?.live.length ?? 0) > 0);
  if (!hasLive || catalogIsStale(current, now())) {
    void discoverModelsOnce(deps).catch(() => undefined);
  }
  return current;
}
