import { db } from "@/lib/db";
import { getCommunityServerContext } from "@/lib/community-server/server-data";
import { hasPermission } from "@/lib/community-server/permissions";
import { EventsChannelPanel } from "@/components/community-server/channels/events-channel-panel";

export async function EventsChannelView({
  communityId,
  communitySlug,
}: {
  communityId: string;
  communitySlug: string;
}) {
  const ctx = await getCommunityServerContext(communitySlug);
  const canManage =
    !!ctx &&
    (ctx.isOwner ||
      hasPermission(ctx.permissions, "manageEvents") ||
      hasPermission(ctx.permissions, "manageServer"));

  const events = await db.event.findMany({
    where: {
      communityId,
      status: "PUBLISHED",
      endsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 20,
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      imageUrl: true,
    },
  });

  return (
    <EventsChannelPanel
      communityId={communityId}
      communitySlug={communitySlug}
      canManage={canManage}
      initialEvents={events.map((e) => ({
        ...e,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
      }))}
    />
  );
}
