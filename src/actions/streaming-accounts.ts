"use server";

import { revalidatePath } from "next/cache";
import { requireAuthMinimal } from "@/lib/auth";
import type { ConnectableStreamingPlatform } from "@/lib/streaming-accounts/types";
import { isConnectablePlatform } from "@/lib/streaming-accounts/types";
import {
  disconnectStreamingAccount,
  existingPlatformAccountWarning,
  findActivePlatformSlot,
  listUserStreamingAccounts,
  startManualConnect,
  startOAuthConnect,
  verifyManualAccount,
} from "@/lib/streaming-accounts/service";
import { revalidateProfileStreamingForUser } from "@/lib/revalidate-profile-streaming";

export async function getMyStreamingAccounts() {
  const user = await requireAuthMinimal();
  const accounts = await listUserStreamingAccounts(user.id);
  return { accounts };
}

export async function connectStreamingAccountOAuth(platform: string, reconnect = false) {
  const user = await requireAuthMinimal();
  if (!isConnectablePlatform(platform)) {
    return { error: "actions.sz6neik" };
  }
  if (!reconnect) {
    const slot = await findActivePlatformSlot(user.id, platform);
    if (slot) return { error: existingPlatformAccountWarning(platform) };
  }
  return startOAuthConnect(user.id, platform);
}

export async function connectStreamingAccountManual(platform: string, channelInput: string) {
  const user = await requireAuthMinimal();
  if (!isConnectablePlatform(platform)) {
    return { error: "actions.sz6neik" };
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
  await revalidateProfileStreamingForUser(user.id);
  return { ok: true as const };
}

export async function disconnectStreamingAccountAction(accountId: string) {
  const user = await requireAuthMinimal();
  const result = await disconnectStreamingAccount(user.id, accountId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings/streaming-accounts");
  revalidatePath("/live/external/new");
  await revalidateProfileStreamingForUser(user.id);
  return { ok: true as const };
}

export type { ConnectableStreamingPlatform };
