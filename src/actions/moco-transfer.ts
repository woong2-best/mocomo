"use server";

import { revalidatePath } from "next/cache";
import { requireAuthForAction } from "@/lib/auth";
import {
  lookupPeerTransferRecipient,
  transferPurchasedMocoToUser,
} from "@/lib/moco/peer-transfer";

async function limitTransfer(userId: string) {
  const { checkRateLimit, apiLimiter } = await import("@/lib/ratelimit");
  const limited = await checkRateLimit(apiLimiter, `moco-transfer:${userId}`);
  if (!limited.success) {
    return { error: "actions.s121u7h2" as const };
  }
  return null;
}

export async function lookupMocoRecipient(username: string) {
  const user = await requireAuthForAction();
  const limited = await limitTransfer(user.id);
  if (limited) return limited;
  const result = await lookupPeerTransferRecipient(user.id, username);
  if ("error" in result) return { error: result.error };
  return {
    username: result.recipient.username,
    name: result.recipient.name,
    payoutsEnabled: result.recipient.payoutsEnabled,
  };
}

export async function transferMocoToUser(username: string, amount: number, message?: string) {
  const user = await requireAuthForAction();
  const limited = await limitTransfer(user.id);
  if (limited) return limited;

  const result = await transferPurchasedMocoToUser({
    senderId: user.id,
    senderUsername: user.username,
    recipientUsername: username,
    amount,
    message,
  });
  if ("error" in result) {
    return { error: result.error, ...("code" in result ? { code: result.code } : {}) };
  }

  revalidatePath("/wallet");
  revalidatePath("/messages");
  return result;
}
