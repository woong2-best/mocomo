"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { setPostsLockedForUser } from "@/lib/posts-lock-settings";

const schema = z.object({
  locked: z.boolean(),
});

export async function updatePostsLocked(data: { locked: boolean }) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" as const };

  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" as const };

  return setPostsLockedForUser(session.user.id, parsed.data.locked);
}
