import type { ReelAuthor } from "@/lib/reels/types";

/** Visible stacked faces on a reel — same cap as the post header. */
export const REEL_COLLAB_STACK_MAX = 3;

type CollabUser = {
  id: string;
  username: string;
  name?: string | null;
  image: string | null;
};

type CollabRow = {
  user?: CollabUser | null;
};

export function mapReelCollaborators(
  authorId: string,
  rows?: CollabRow[] | null
): ReelAuthor[] {
  const out: ReelAuthor[] = [];
  const seen = new Set<string>([authorId]);
  for (const row of rows ?? []) {
    const u = row.user;
    if (!u?.id || seen.has(u.id)) continue;
    seen.add(u.id);
    out.push({
      id: u.id,
      username: u.username,
      name: u.name ?? null,
      image: u.image,
    });
  }
  return out;
}

export function reelCollabStack(author: ReelAuthor, others: ReelAuthor[]): ReelAuthor[] {
  return [author, ...others].slice(0, REEL_COLLAB_STACK_MAX);
}
