"use server";

import { revalidatePath } from "next/cache";
import { auth, requireAuthForAction } from "@/lib/auth";
import {
  acceptDirectMeet,
  adjustDirectMeet,
  getDirectTradeView,
  listDirectTradesForUser,
  proposeDirectMeet,
  reportDirectNoShow,
  submitDirectTradePin,
  verifyDirectArrival,
} from "@/lib/direct-trade/service";
import type { DirectTradeResult, DirectTradeView } from "@/lib/direct-trade/types";

async function done(result: DirectTradeResult): Promise<DirectTradeResult> {
  if (result.view.roomId) revalidatePath(`/messages/${result.view.roomId}`);
  if (result.view.listingId) revalidatePath(`/market/${result.view.listingId}`);
  return result;
}

export async function getMyDirectTrade(listingId?: string, roomId?: string): Promise<DirectTradeView | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getDirectTradeView(session.user.id, { listingId, roomId });
}

export async function listMyDirectTrades(): Promise<DirectTradeView[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return listDirectTradesForUser(session.user.id);
}

export async function proposeDirectMeetAction(listingId: string, meetAt: string) {
  const user = await requireAuthForAction();
  return done(await proposeDirectMeet(user.id, listingId, meetAt));
}

export async function acceptDirectMeetAction(listingId: string) {
  const user = await requireAuthForAction();
  return done(await acceptDirectMeet(user.id, listingId));
}

export async function adjustDirectMeetAction(listingId: string, direction: "earlier" | "later") {
  const user = await requireAuthForAction();
  return done(await adjustDirectMeet(user.id, listingId, direction));
}

export async function verifyDirectArrivalAction(
  listingId: string,
  sample: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number | null;
    failure?: "PERMISSION_DENIED" | "GPS_FAILED";
  }
) {
  const user = await requireAuthForAction();
  return done(await verifyDirectArrival(user.id, listingId, sample));
}

export async function reportDirectNoShowAction(listingId: string) {
  const user = await requireAuthForAction();
  return done(await reportDirectNoShow(user.id, listingId));
}

export async function submitDirectTradePinAction(listingId: string, pin: string) {
  const user = await requireAuthForAction();
  return done(await submitDirectTradePin(user.id, listingId, pin));
}
