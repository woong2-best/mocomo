import { MembersChannelClient } from "@/components/community-server/channels/members-channel-client";

export async function MembersChannelView({ communityId }: { communityId: string }) {
  return <MembersChannelClient communityId={communityId} />;
}
