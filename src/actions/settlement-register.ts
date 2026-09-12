"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  getCreatorSettlementStatusForUser,
  registerCreatorSettlementForUser,
  type RegisterSettlementInput,
} from "@/lib/settlement-register-service";

export async function registerCreatorSettlement(raw: RegisterSettlementInput) {
  const user = await requireAuth();
  const result = await registerCreatorSettlementForUser(user.id, raw);
  if ("error" in result && result.error) return result;

  revalidatePath("/wallet");
  revalidatePath("/settings/creator");
  revalidatePath("/market/seller/register");
  return result;
}

export async function getCreatorSettlementStatus() {
  const user = await requireAuth();
  return getCreatorSettlementStatusForUser(user.id);
}
