"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  FEED_DISPLAY_MODE_COOKIE,
  FEED_DISPLAY_MODES,
  type FeedDisplayMode,
} from "@/lib/feed-display-mode";

const schema = z.object({
  mode: z.enum(FEED_DISPLAY_MODES),
});

export async function updateFeedDisplayMode(data: { mode: FeedDisplayMode }) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" as const };

  const mode = parsed.data.mode;
  const cookieStore = await cookies();
  cookieStore.set(FEED_DISPLAY_MODE_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await db.user.update({
      where: { id: session.user.id },
      data: { feedDisplayMode: mode },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/feed");
  revalidatePath("/settings");
  return { success: true as const, mode };
}
