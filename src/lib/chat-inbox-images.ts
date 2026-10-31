import { displayableImageUrl } from "@/lib/displayable-image-url";
import { hydratePublicUserImagesById } from "@/lib/oauth-vault";

/** Restore OAuth vault avatars on inbox members (User.image is null for vault-only accounts). */
export async function withHydratedChatMemberImages<
  T extends { members: { user: { id: string; image: string | null } }[] },
>(rooms: T[]): Promise<T[]> {
  const userIds = new Set<string>();
  for (const room of rooms) {
    for (const m of room.members) {
      if (!displayableImageUrl(m.user.image)) userIds.add(m.user.id);
    }
  }
  if (userIds.size === 0) return rooms;

  const imageById = await hydratePublicUserImagesById([...userIds]);
  return rooms.map((room) => ({
    ...room,
    members: room.members.map((m) => {
      const hydrated = imageById.get(m.user.id);
      if (hydrated === undefined) return m;
      return { ...m, user: { ...m.user, image: hydrated } };
    }),
  }));
}
