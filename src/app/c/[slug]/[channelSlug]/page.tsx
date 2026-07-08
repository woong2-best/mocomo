import { notFound } from "next/navigation";
import { getCommunityServerContext, getCommunityChannelCached } from "@/lib/community-server/server-data";
import { PostsChannelView } from "@/components/community-server/channels/posts-channel";
import { TextChannelView } from "@/components/community-server/channels/text-channel";
import { VoiceChannelView } from "@/components/community-server/channels/voice-channel-view";
import { LiveChannelView } from "@/components/community-server/channels/live-channel";
import { MembersChannelView } from "@/components/community-server/channels/members-channel";
import { SettingsChannelView } from "@/components/community-server/channels/settings-channel";
import { EventsChannelView } from "@/components/community-server/channels/events-channel";
import { GalleryChannelView } from "@/components/community-server/channels/gallery-channel";
import { FileChannelView } from "@/components/community-server/channels/file-channel";
import { hasPermission } from "@/lib/community-server/permissions";

export const dynamic = "force-dynamic";

export default async function CommunityChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;

  const [ctx, channel] = await Promise.all([
    getCommunityServerContext(slug),
    getCommunityChannelCached(slug, channelSlug),
  ]);
  if (!ctx || !channel) notFound();

  if (
    channel.type === "SETTINGS" &&
    !ctx.isOwner &&
    !hasPermission(ctx.permissions, "manageServer") &&
    !hasPermission(ctx.permissions, "manageChannels") &&
    !hasPermission(ctx.permissions, "manageJoinRequests") &&
    !hasPermission(ctx.permissions, "manageRoles")
  ) {
    notFound();
  }

  const guestReadable =
    channel.type === "POSTS" ||
    channel.type === "TEXT" ||
    channel.type === "ANNOUNCEMENT" ||
    channel.type === "QA" ||
    channel.type === "VOICE" ||
    channel.type === "VIDEO" ||
    channel.type === "GALLERY" ||
    channel.type === "MEMBERS";

  if (!guestReadable && !ctx.isMember && !ctx.isOwner) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground text-sm">
        이 채널을 보려면 커뮤니티에 가입해 주세요.
      </div>
    );
  }

  if (
    channel.vipOnly &&
    !ctx.isOwner &&
    !hasPermission(ctx.permissions, "vipChannels") &&
    !hasPermission(ctx.permissions, "vipBadge") &&
    !hasPermission(ctx.permissions, "manageChannels")
  ) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground text-sm space-y-2">
        <p className="text-2xl">⭐</p>
        <p>VIP 전용 채널입니다.</p>
      </div>
    );
  }

  switch (channel.type) {
    case "POSTS":
      return (
        <PostsChannelView communitySlug={slug} communityId={ctx.communityId} />
      );

    case "TEXT":
    case "ANNOUNCEMENT":
    case "QA":
      if (!channel.chatRoomId) notFound();
      return (
        <TextChannelView
          roomId={channel.chatRoomId}
          channelId={channel.id}
          channelName={channel.name}
          communityId={ctx.communityId}
          communitySlug={slug}
          isPublic={ctx.isPublic}
          readOnly={!ctx.isMember && !ctx.isOwner}
        />
      );

    case "VOICE":
    case "VIDEO":
      if (!channel.voiceChannelId) notFound();
      return (
        <VoiceChannelView
          channelId={channel.voiceChannelId}
          channelName={channel.type === "VIDEO" ? "음성/영상" : channel.name}
          maxUsers={channel.maxUsers}
          communityId={ctx.communityId}
          readOnly={!ctx.isMember && !ctx.isOwner}
        />
      );

    case "LIVE":
      if (!channel.voiceChannelId) notFound();
      if (!ctx.isMember && !ctx.isOwner) {
        return (
          <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground text-sm">
            라이브 채널은 멤버만 이용할 수 있습니다.
          </div>
        );
      }
      return (
        <LiveChannelView
          voiceChannelId={channel.voiceChannelId}
          channelName={channel.name}
          communitySlug={slug}
          isOwner={ctx.isOwner}
        />
      );

    case "EVENT":
      return <EventsChannelView communityId={ctx.communityId} communitySlug={slug} />;

    case "GALLERY":
      return <GalleryChannelView communityId={ctx.communityId} />;

    case "FILE":
      if (!ctx.isMember && !ctx.isOwner) notFound();
      return <FileChannelView communityId={ctx.communityId} />;

    case "MEMBERS":
      return <MembersChannelView communityId={ctx.communityId} />;

    case "SETTINGS":
      return (
        <SettingsChannelView
          communityId={ctx.communityId}
          communitySlug={slug}
          isOwner={ctx.isOwner}
          permissions={ctx.permissions}
        />
      );

    default:
      notFound();
  }
}
