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
    message: t("actions.s59uesp"),
  });

export async function updateContactAudience(data: {
  messageRequestAudience?: "EVERYONE" | "FOLLOWING_ONLY";
  callRequestAudience?: "EVERYONE" | "FOLLOWING_ONLY";
}) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: "actions.slqeo1f" as const };

  const session = await auth();
  if (!session?.user?.id) return { error: "actions.s1mzxopt" as const };

  const settings = await saveContactSettings(session.user.id, parsed.data);
  return { settings };
}

export async function loadContactAudience() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getContactSettings(session.user.id);
}
