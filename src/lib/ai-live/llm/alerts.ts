import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { alertCooldownMs } from "@/lib/ai-live/llm/config";
import { safeLogWarn } from "@/lib/safe-log";
import type { AvatarLlmCompany } from "@/lib/ai-live/llm/types";

const ALERT_KEY = "avatar-llm-alerts";

type AlertMap = Record<string, string>;

function webhookUrl(): string {
  return process.env.ALERT_WEBHOOK_URL?.trim() || "";
}

async function loadMap(): Promise<AlertMap> {
  const row = await db.siteSetting.findUnique({ where: { key: ALERT_KEY } });
  return row?.value && typeof row.value === "object" && !Array.isArray(row.value)
    ? (row.value as AlertMap)
    : {};
}

async function saveMap(map: AlertMap): Promise<void> {
  const value = map as unknown as Prisma.InputJsonValue;
  await db.siteSetting.upsert({
    where: { key: ALERT_KEY },
    create: { key: ALERT_KEY, value },
    update: { value },
  });
}

export type AvatarLlmAlert = {
  key: string;
  text: string;
};

export async function sendAvatarLlmAlert(alert: AvatarLlmAlert, now = Date.now()): Promise<boolean> {
  const url = webhookUrl();
  if (!url) return false;
  const map = await loadMap().catch(() => ({} as AlertMap));
  const prev = Date.parse(map[alert.key] ?? "");
  if (Number.isFinite(prev) && now - prev < alertCooldownMs()) return false;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5_000),
      body: JSON.stringify({ content: alert.text }),
    });
    if (!res.ok) {
      safeLogWarn("live-llm-alert", { result: "fail", status: res.status });
      return false;
    }
    await saveMap({ ...map, [alert.key]: new Date(now).toISOString() }).catch(() => undefined);
    return true;
  } catch {
    safeLogWarn("live-llm-alert", { result: "throw" });
    return false;
  }
}

export function deadModelAlert(company: AvatarLlmCompany, model: string, status: number, avatar: string): AvatarLlmAlert {
  return {
    key: `dead:${company}:${model}`,
    text: `[avatar-llm] ${avatar} model marked dead company=${company} model=${model} status=${status}`,
  };
}

export function exhaustedAlert(avatar: string): AvatarLlmAlert {
  return {
    key: `exhausted:${avatar}`,
    text: `[avatar-llm] ${avatar} exhausted every company including Workers AI`,
  };
}
