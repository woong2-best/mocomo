"use server";

import { after } from "next/server";
import { requireAuthMinimal } from "@/lib/auth";
import {
  enqueueCreatorBulkDm,
  getCreatorMarketingSettings,
  processCreatorBulkDmJob,
  saveCreatorWelcomeMessage,
  type CreatorMarketingSettingsDto,
} from "@/lib/creator-dm-marketing";

export type { CreatorMarketingSettingsDto };

export async function getCreatorMarketingSettingsAction(): Promise<CreatorMarketingSettingsDto> {
  const user = await requireAuthMinimal();
  return getCreatorMarketingSettings(user.id);
}

export async function saveCreatorWelcomeMessageAction(input: {
  enabled: boolean;
  text?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
  mediaPriceKrw?: number | null;
}): Promise<{ ok: true; settings: CreatorMarketingSettingsDto } | { ok: false; error: string }> {
  const user = await requireAuthMinimal();
  return saveCreatorWelcomeMessage(user.id, input);
}

export async function sendCreatorBulkDmAction(input: {
  text?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
  mediaPriceKrw?: number | null;
}): Promise<
  | { ok: true; jobId: string; totalFollowers: number; settings: CreatorMarketingSettingsDto }
  | { ok: false; error: string }
> {
  const user = await requireAuthMinimal();
  const result = await enqueueCreatorBulkDm(user.id, input);
  if (result.ok) {
    after(() => processCreatorBulkDmJob(result.jobId));
  }
  return result;
}
