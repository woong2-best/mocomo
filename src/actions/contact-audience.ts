"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { getContactSettings, saveContactSettings } from "@/lib/contact-audience";

const audience = z.enum(["EVERYONE", "FOLLOWING_ONLY"]);

const schema = z
  .object({
    messageRequestAudience: audience.optional(),
    callRequestAudience: audience.optional(),
  })
  .refine((value) => value.messageRequestAudience || value.callRequestAudience, {
    message: "변경할 설정이 없습니다.",
  });

export async function updateContactAudience(data: {
  messageRequestAudience?: "EVERYONE" | "FOLLOWING_ONLY";
  callRequestAudience?: "EVERYONE" | "FOLLOWING_ONLY";
}) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해 주세요." as const };

  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." as const };

  const settings = await saveContactSettings(session.user.id, parsed.data);
  return { settings };
}

export async function loadContactAudience() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getContactSettings(session.user.id);
}
