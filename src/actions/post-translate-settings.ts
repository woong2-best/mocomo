"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isPostTranslateInto,
  POST_TRANSLATE_LANGS,
  POST_TRANSLATE_OFF,
} from "@/lib/client-translate/opus-mt-pairs";

const schema = z.object({
  postTranslateInto: z.string().refine((v) => isPostTranslateInto(v), "Invalid language"),
});

export async function updatePostTranslateInto(data: {
  postTranslateInto: string;
}): Promise<{ ok: true; postTranslateInto: string } | { error: string }> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: "actions.slqeo1f" };

  const session = await auth();
  if (!session?.user?.id) return { error: "common.error.authRequired" };

  const postTranslateInto = parsed.data.postTranslateInto;
  await db.user.update({
    where: { id: session.user.id },
    data: { postTranslateInto },
  });

  return { ok: true, postTranslateInto };
}

export const POST_TRANSLATE_SETTING_OPTIONS = [POST_TRANSLATE_OFF, ...POST_TRANSLATE_LANGS] as const;
