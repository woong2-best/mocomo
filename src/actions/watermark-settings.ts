"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isWatermarkPlacement,
  type WatermarkPlacement,
} from "@/lib/media-watermark";

export type WatermarkSettings = {
  enabled: boolean;
  placement: WatermarkPlacement | null;
};

const patchSchema = z.object({
  enabled: z.boolean(),
  placement: z.enum(["corner", "diagonal"]).nullable().optional(),
});

export async function getWatermarkSettings(): Promise<WatermarkSettings> {
  const session = await auth();
  if (!session?.user?.id) return { enabled: false, placement: null };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { watermarkInsertEnabled: true, watermarkPlacement: true },
  });
  if (!user) return { enabled: false, placement: null };

  return {
    enabled: user.watermarkInsertEnabled,
    placement: isWatermarkPlacement(user.watermarkPlacement)
      ? user.watermarkPlacement
      : null,
  };
}

export async function updateWatermarkSettings(data: {
  enabled: boolean;
  placement?: WatermarkPlacement | null;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = patchSchema.safeParse(data);
  if (!parsed.success) return { error: "actions.slqeo1f" };

  const session = await auth();
  if (!session?.user?.id) return { error: "common.error.authRequired" };

  await db.user.update({
    where: { id: session.user.id },
    data: {
      watermarkInsertEnabled: parsed.data.enabled,
      ...(parsed.data.placement !== undefined
        ? { watermarkPlacement: parsed.data.placement }
        : {}),
    },
  });

  return { ok: true };
}
