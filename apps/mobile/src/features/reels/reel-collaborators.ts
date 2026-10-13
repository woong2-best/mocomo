export const REEL_COLLAB_STACK_MAX = 3;

export type ReelCollabUser = {
  id: string;
  username: string;
  name?: string | null;
  image: string | null;
};

type CollabRow = {
  user?: ReelCollabUser | null;
};

export function reelDisplayName(user: { username: string; name?: string | null }): string {
  return user.name?.trim() || user.username;
}

export function mapReelCollaborators(
  authorId: string,
  rows?: CollabRow[] | null
): ReelCollabUser[] {
  const out: ReelCollabUser[] = [];
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

export function reelCollabStack(author: ReelCollabUser, others: ReelCollabUser[]): ReelCollabUser[] {
  return [author, ...others].slice(0, REEL_COLLAB_STACK_MAX);
}
