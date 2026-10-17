"use server";

import { requireAuth } from "@/lib/auth";
import {
  createDigitalCommission,
  listDigitalCommissions,
  respondDigitalCommission,
} from "@/lib/digital-commission";

export async function sendCommissionRequest(input: {
  sellerId: string;
  brief: string;
  purpose: string;
  referenceUrls?: string[];
}) {
  const user = await requireAuth();
  return createDigitalCommission({
    buyerId: user.id,
    sellerId: input.sellerId,
    brief: input.brief,
    purpose: input.purpose,
    referenceUrls: input.referenceUrls ?? [],
  });
}

export async function getMyCommissions() {
  const user = await requireAuth();
  return { items: await listDigitalCommissions(user.id) };
}

export async function answerCommissionRequest(input: {
  id: string;
  action: "accept" | "decline";
  price?: number;
  estimatedDays?: number;
  currency?: string;
}) {
  const user = await requireAuth();
  return respondDigitalCommission(user.id, input.id, input.action, {
    price: input.price ?? 0,
    estimatedDays: input.estimatedDays ?? 0,
    currency: input.currency,
  });
}
