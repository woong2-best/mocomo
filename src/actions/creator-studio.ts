"use server";

import { requireAuth } from "@/lib/auth";
import {
  joinStudioWaitlist,
  placeStudioOrder,
  saveCreatorStudio,
  type StudioInput,
} from "@/lib/creator-studio";

export async function orderCreatorStudio(input: {
  studioId: string;
  tierId: string;
  addonIds: string[];
  answers: Record<string, string>;
  agreed: boolean;
}) {
  const user = await requireAuth({ writeKind: "default" });
  return placeStudioOrder(user.id, input.studioId, input);
}

export async function waitlistCreatorStudio(studioId: string) {
  const user = await requireAuth({ writeKind: "default" });
  return joinStudioWaitlist(user.id, studioId);
}

export async function saveMyCreatorStudio(input: StudioInput) {
  const user = await requireAuth({ writeKind: "default" });
  return saveCreatorStudio(user.id, user.username || "seller", input);
}
