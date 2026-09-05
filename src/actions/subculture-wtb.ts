"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  createWtbAlert,
  deactivateWtbAlert,
  listMyWtbAlerts,
} from "@/lib/subculture-commerce/wtb-alerts";

export async function createSubcultureWtbAlert(input: {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
  maxPrice?: number | null;
  currency?: string | null;
  note?: string | null;
}) {
  const user = await requireAuth();
  const result = await createWtbAlert(user.id, input);
  if ("error" in result) return result;
  revalidatePath("/used");
  revalidatePath("/used/my");
  revalidatePath("/used/wtb");
  return result;
}

export async function getMySubcultureWtbAlerts() {
  const user = await requireAuth();
  return listMyWtbAlerts(user.id);
}

export async function removeSubcultureWtbAlert(alertId: string) {
  const user = await requireAuth();
  const result = await deactivateWtbAlert(user.id, alertId);
  if ("error" in result) return result;
  revalidatePath("/used");
  revalidatePath("/used/my");
  revalidatePath("/used/wtb");
  return result;
}
