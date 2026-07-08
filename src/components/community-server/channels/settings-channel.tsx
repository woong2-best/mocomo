import { notFound } from "next/navigation";
import { CommunitySettingsForm } from "@/components/communities/community-settings-form";
import { CommunityRolesPanel } from "@/components/community-server/channels/settings-roles-panel";
import { db } from "@/lib/db";

export async function SettingsChannelView({
  communityId,
  communitySlug,
  isOwner,
}: {
  communityId: string;
  communitySlug: string;
  isOwner: boolean;
}) {
  if (!isOwner) notFound();

  const community = await db.community.findUnique({
    where: { id: communityId },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      isNsfw: true,
    },
  });
  if (!community) notFound();

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold">서버 설정</h1>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-8 max-w-2xl">
        <CommunitySettingsForm
          communityId={community.id}
          slug={communitySlug}
          initial={{
            name: community.name,
            description: community.description ?? "",
            category: community.category,
            isNsfw: community.isNsfw,
          }}
        />
        <CommunityRolesPanel communityId={communityId} communitySlug={communitySlug} />
      </div>
    </div>
  );
}
