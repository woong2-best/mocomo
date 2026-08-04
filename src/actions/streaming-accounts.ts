"use server";

import { revalidatePath } from "next/cache";
import { requireAuthMinimal } from "@/lib/auth";
import type { ConnectableStreamingPlatform } from "@/lib/streaming-accounts/types";
import { isConnectablePlatform } from "@/lib/streaming-accounts/types";
import {
  disconnectStreamingAccount,
  listUserStreamingAccounts,
  startManualConnect,
  startOAuthConnect,
  verifyManualAccount,
} from "@/lib/streaming-accounts/service";

export async function getMyStreamingAccounts() {
  const user = await requireAuthMinimal();
  const accounts = await listUserStreamingAccounts(user.id);
  return { accounts };
}

export async function connectStreamingAccountOAuth(platform: string) {
  const user = await requireAuthMinimal();
  if (!isConnectablePlatform(platform)) {
    return { error: "지원하지 않는 플랫폼입니다." };
  }
  return startOAuthConnect(user.id, platform);
}

export async function connectStreamingAccountManual(platform: string, channelInput: string) {
  const user = await requireAuthMinimal();
  if (!isConnectablePlatform(platform)) {
    return { error: "지원하지 않는 플랫폼입니다." };
  }
  const result = await startManualConnect(user.id, platform, channelInput);
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings/streaming-accounts");
  return {
    accountId: result.accountId,
    verificationCode: result.verificationCode,
  };
}

export async function verifyStreamingAccount(accountId: string) {
  const user = await requireAuthMinimal();
  const result = await verifyManualAccount(user.id, accountId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings/streaming-accounts");
  revalidatePath("/live/external/new");
  return { ok: true as const };
}

export async function disconnectStreamingAccountAction(accountId: string) {
  const user = await requireAuthMinimal();
  const result = await disconnectStreamingAccount(user.id, accountId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings/streaming-accounts");
  revalidatePath("/live/external/new");
  return { ok: true as const };
}

export type { ConnectableStreamingPlatform };
