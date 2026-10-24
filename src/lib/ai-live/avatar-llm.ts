import { classifyAiHostMessage, textHasHangul } from "@/lib/ai-live/blocklist";
import { resolveLiveAvatarId, type LiveAvatarId } from "@/lib/ai-live/avatars";
import { promptForCharacter } from "@/constants/prompts";
import type { VrmEmotion } from "@/lib/ai-live/vrm-expression";
import {
  candidateTimeoutMs,
  companyConfigured,
  fallbackCompanyOrder,
  primaryCompanyForAvatar,
  providerConfig,
  requestBudgetMs,
} from "@/lib/ai-live/llm/config";
import {
  markModelCooldown,
  markModelDead,
  providerState,
  siteSettingCatalogStore,
  usableModels,
} from "@/lib/ai-live/llm/catalog";
import { deadModelAlert, exhaustedAlert, sendAvatarLlmAlert } from "@/lib/ai-live/llm/alerts";
import { discoverModelsOnce, ensureCatalog } from "@/lib/ai-live/llm/discover";
import { companyChat } from "@/lib/ai-live/llm/providers";
import type { AvatarLlmCatalog, AvatarLlmCompany, CatalogStore, ChatResult } from "@/lib/ai-live/llm/types";
import { safeLogWarn } from "@/lib/safe-log";

const AI_ADMISSION =
  /\b(?:as an ai|i am an ai|i'm an ai|language model|large language model)\b/i;

export type AvatarReply = {
  text: string;
  emotion: VrmEmotion;
  blocked: boolean;
  rateLimited: boolean;
  exhausted?: boolean;
};

export type ReplyDeps = {
  store?: CatalogStore;
  chat?: typeof companyChat;
  ensure?: typeof ensureCatalog;
  alert?: typeof sendAvatarLlmAlert;
  rediscover?: typeof discoverModelsOnce;
  configured?: (company: AvatarLlmCompany) => boolean;
  now?: () => number;
  budgetMs?: number;
  candidateMs?: number;
};

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

export function quietLine(userText: string): string {
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

function finish(userText: string, result: Extract<ChatResult, { kind: "text" }>): AvatarReply {
  if (AI_ADMISSION.test(result.text)) {
    return { text: deflect(userText), emotion: "angry", blocked: false, rateLimited: false };
  }
  const blocked = classifyAiHostMessage(result.text);
  if (blocked) return { text: blocked.text, emotion: "angry", blocked: true, rateLimited: false };
  return { text: result.text, emotion: result.emotion, blocked: false, rateLimited: false };
}

function modelsForCompany(catalog: AvatarLlmCatalog, company: AvatarLlmCompany, limit: number): string[] {
  if (company === "workers-ai") return ["workers-ai"];
  const live = usableModels(catalog, company);
  if (live.length) return live.slice(0, limit);
  const dead = providerState(catalog, company).dead;
  return providerConfig(company)
    .candidates.filter((id) => !dead[id])
    .slice(0, limit);
}

function buildChain(avatar: LiveAvatarId, catalog: AvatarLlmCatalog, configured: (company: AvatarLlmCompany) => boolean) {
  const primary = primaryCompanyForAvatar(avatar);
  const slots: { company: AvatarLlmCompany; model: string }[] = [];
  const seen = new Set<string>();
  const push = (company: AvatarLlmCompany, model: string) => {
    const key = `${company}:${model}`;
    if (seen.has(key)) return;
    seen.add(key);
    slots.push({ company, model });
  };
  if (configured(primary)) {
    for (const model of modelsForCompany(catalog, primary, 3)) push(primary, model);
  }
  for (const company of fallbackCompanyOrder(primary)) {
    if (!configured(company)) continue;
    const limit = company === "workers-ai" ? 1 : 2;
    for (const model of modelsForCompany(catalog, company, limit)) push(company, model);
  }
  return slots;
}

/** Route one line through the avatar's company, then the shared fallback chain. */
export async function replyForAvatar(
  userText: string,
  characterId: string | null,
  deps: ReplyDeps = {},
): Promise<AvatarReply> {
  const avatar: LiveAvatarId = resolveLiveAvatarId(characterId) ?? "zelie";
  const system = systemInstructionFor(avatar);
  const store = deps.store ?? siteSettingCatalogStore();
  const chat = deps.chat ?? companyChat;
  const ensure = deps.ensure ?? ensureCatalog;
  const alert = deps.alert ?? sendAvatarLlmAlert;
  const rediscover = deps.rediscover ?? discoverModelsOnce;
  const configured = deps.configured ?? companyConfigured;
  const now = deps.now ?? Date.now;
  const budgetMs = deps.budgetMs ?? requestBudgetMs();
  const candidateMs = deps.candidateMs ?? candidateTimeoutMs();
  const deadline = now() + budgetMs;

  try {
    let catalog = await ensure({ store });
    const chain = buildChain(avatar, catalog, configured);
    let sawRateLimit = false;
    let sawHardFail = false;

    for (const slot of chain) {
      const remaining = deadline - now();
      if (remaining < 200) break;
      const timeoutMs = Math.min(candidateMs, remaining);
      const result = await chat({
        company: slot.company,
        model: slot.model,
        system,
        userText,
        timeoutMs,
      });

      if (result.kind === "text") return finish(userText, result);
      if (result.kind === "safety") {
        return { text: angryOrHard(userText), emotion: "angry", blocked: true, rateLimited: false };
      }

      safeLogWarn("live-llm", {
        avatar,
        company: slot.company,
        model: slot.model,
        result: result.kind,
        status: "status" in result ? result.status ?? null : null,
      });

      if (result.kind === "rate_limit") {
        sawRateLimit = true;
        catalog = markModelCooldown(catalog, slot.company, slot.model, result.status, now());
        await store.save(catalog).catch(() => undefined);
        continue;
      }
      sawHardFail = true;
      if (result.kind === "dead") {
        catalog = markModelDead(catalog, slot.company, slot.model, result.status, now());
        await store.save(catalog).catch(() => undefined);
        void alert(deadModelAlert(slot.company, slot.model, result.status, avatar)).catch(() => undefined);
        void rediscover({ store }).catch(() => undefined);
      }
    }

    if (sawRateLimit && !sawHardFail) {
      return { text: rateLimitLine(userText), emotion: "sad", blocked: false, rateLimited: true };
    }

    void alert(exhaustedAlert(avatar)).catch(() => undefined);
    safeLogWarn("live-llm", { avatar, result: "exhausted" });
    return { text: quietLine(userText), emotion: "sad", blocked: false, rateLimited: false, exhausted: true };
  } catch {
    safeLogWarn("live-llm", { avatar, result: "throw" });
    return { text: quietLine(userText), emotion: "sad", blocked: false, rateLimited: false, exhausted: true };
  }
}
