"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createFleaEvent,
  createFleaNpcOffer,
  deleteFleaEvent,
  deleteFleaNpcOffer,
  forceEndFleaEvent,
  forceStartFleaEvent,
  getAdminFleaEventDetail,
  getFleaCatalogItems,
  listAdminFleaEvents,
  toggleFleaEventField,
  toggleFleaNpcOffer,
  updateFleaEventField,
  type FleaNpcKind,
} from "@/lib/apt/economy/admin-flea-service";

const FLEA_PATH = "/admin/economy/flea";

function revalidate() {
  revalidatePath(FLEA_PATH);
  revalidatePath("/admin/economy");
  revalidatePath("/apt");
}

export async function getFleaAdminPageData() {
  await requireAdmin();
  const [events, catalogItems] = await Promise.all([
    listAdminFleaEvents(),
    Promise.resolve(getFleaCatalogItems()),
  ]);
  return { events, catalogItems };
}

export async function getFleaAdminDetail(eventId: string) {
  await requireAdmin();
  return getAdminFleaEventDetail(eventId);
}

export async function adminCreateFleaEvent(
  input: Parameters<typeof createFleaEvent>[1]
) {
  const admin = await requireAdmin();
  const res = await createFleaEvent(admin.id, input);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminToggleFleaEvent(
  eventId: string,
  field: "active" | "published",
  value: boolean
) {
  const admin = await requireAdmin();
  const event = await toggleFleaEventField(eventId, admin.id, field, value);
  revalidate();
  return event;
}

export async function adminUpdateFleaEvent(
  eventId: string,
  field: Parameters<typeof updateFleaEventField>[2],
  value: Parameters<typeof updateFleaEventField>[3]
) {
  const admin = await requireAdmin();
  const event = await updateFleaEventField(eventId, admin.id, field, value);
  revalidate();
  return event;
}

export async function adminForceStartFleaEvent(eventId: string) {
  const admin = await requireAdmin();
  const event = await forceStartFleaEvent(eventId, admin.id);
  revalidate();
  return event;
}

export async function adminForceEndFleaEvent(eventId: string) {
  const admin = await requireAdmin();
  const event = await forceEndFleaEvent(eventId, admin.id);
  revalidate();
  return event;
}

export async function adminDeleteFleaEvent(eventId: string) {
  const admin = await requireAdmin();
  const ok = await deleteFleaEvent(eventId, admin.id);
  if (!ok) return { error: "진행 중인 판매가 있거나 이벤트를 찾을 수 없습니다." };
  revalidate();
  return { ok: true as const };
}

export async function adminCreateFleaNpcOffer(
  eventId: string,
  input: {
    kind: FleaNpcKind;
    stickerTypeId: string;
    goldPrice?: number;
    discountPercent?: number | null;
    stock?: number | null;
  }
) {
  const admin = await requireAdmin();
  const res = await createFleaNpcOffer(eventId, admin.id, input);
  revalidate();
  return res;
}

export async function adminToggleFleaNpcOffer(offerId: string, enabled: boolean) {
  const admin = await requireAdmin();
  const offer = await toggleFleaNpcOffer(offerId, admin.id, enabled);
  revalidate();
  return offer;
}

export async function adminDeleteFleaNpcOffer(offerId: string) {
  const admin = await requireAdmin();
  const ok = await deleteFleaNpcOffer(offerId, admin.id);
  revalidate();
  return { ok };
}
